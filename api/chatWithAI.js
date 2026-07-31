import { createClient } from "@supabase/supabase-js";

// Verifica o token de sessão do Supabase - getUser(token) faz uma
// chamada ao servidor de Auth do Supabase pra validar o JWT (não confia
// só em decodificar localmente). Não precisa da chave secreta pra isso,
// a publishable já basta.
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

// O cliente manda blocos de anexo como {type:"file", source:{type:"base64",
// media_type, data}} (imagem, PDF ou áudio - o media_type que diferencia).
function hasAttachment(messages) {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((c) => c.type === "file" || c.type === "image")
  );
}

function blockMediaType(block) {
  return block.source?.media_type || block.media_type;
}

// --- Groq: só texto, formato compatível com a OpenAI -----------------

function groqTextModel() {
  return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
}

function toPlainText(content) {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function callGroq(apiKey, system, messages) {
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada");
  const converted = messages.map((m) => ({ role: m.role, content: toPlainText(m.content) }));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: groqTextModel(),
      messages: [{ role: "system", content: system }, ...converted],
      max_tokens: 1500,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq respondeu ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// --- Gemini: texto e anexos (imagem/PDF/áudio), formato nativo --------
//
// A camada compatível com a OpenAI do Gemini só documenta bem imagem;
// PDF e áudio têm suporte de primeira classe documentado na API nativa
// (generateContent), então usamos ela sempre que tem anexo. Formato:
// contents=[{role:"user"|"model", parts:[{text}|{inline_data}]}].

function geminiModel() {
  // gemini-2.5-flash: confirmado no tier gratuito do Google AI Studio,
  // com suporte nativo a imagem, PDF e áudio. Se quiser trocar, defina
  // GEMINI_MODEL - mas confirme antes em ai.google.dev/gemini-api/docs.
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function toGeminiParts(content) {
  if (typeof content === "string") return [{ text: content }];
  return content.map((block) => {
    if (block.type === "file" || block.type === "image") {
      return { inline_data: { mime_type: blockMediaType(block), data: block.source.data } };
    }
    return { text: block.text };
  });
}

async function callGemini(apiKey, system, messages) {
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: toGeminiParts(m.content),
  }));
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] } }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini respondeu ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) throw error || new Error("no user");
  } catch {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  // Cliente autenticado como o próprio usuário (via JWT dele), pra que
  // auth.uid() resolva certo dentro da função consume_ai_quota() no banco.
  const supabaseAsUser = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  let quota = { allowed: true, remaining: null, is_premium: true, daily_limit: null };
  try {
    const { data: quotaRows, error: quotaError } = await supabaseAsUser.rpc("consume_ai_quota");
    if (quotaError) throw quotaError;
    quota = quotaRows?.[0] || quota;
  } catch (err) {
    console.error("Erro consultando cota de IA:", err.message);
    // Se a checagem de cota falhar por algum motivo (ex.: schema_billing.sql
    // ainda não foi rodado), deixa passar em vez de travar o app inteiro.
  }

  if (!quota.allowed) {
    res.status(402).json({
      error: "quota_exceeded",
      message: "Você atingiu o limite diário gratuito de gerações de IA. Assine o Premium pra ter uso ilimitado.",
      dailyLimit: quota.daily_limit,
    });
    return;
  }

  const { system, messages } = req.body || {};
  if (!system || !Array.isArray(messages)) {
    res.status(400).json({ error: "invalid_argument" });
    return;
  }

  if (hasAttachment(messages)) {
    // Groq não processa imagem/PDF/áudio - qualquer anexo vai direto pro
    // Gemini, sem tentar a Groq antes.
    try {
      const text = await callGemini(process.env.GEMINI_API_KEY, system, messages);
      res.status(200).json({ text, provider: "gemini", quota });
    } catch (err) {
      console.error("Gemini (anexo) falhou:", err.message);
      res.status(500).json({ error: "internal", message: "Não foi possível analisar o arquivo agora." });
    }
    return;
  }

  try {
    const text = await callGroq(process.env.GROQ_API_KEY, system, messages);
    res.status(200).json({ text, provider: "groq", quota });
  } catch (err) {
    console.warn("Groq falhou, tentando Gemini:", err.message);
    try {
      const text = await callGemini(process.env.GEMINI_API_KEY, system, messages);
      res.status(200).json({ text, provider: "gemini", quota });
    } catch (err2) {
      console.error("Gemini também falhou:", err2.message);
      res.status(500).json({ error: "internal", message: "Não foi possível gerar resposta agora." });
    }
  }
}
