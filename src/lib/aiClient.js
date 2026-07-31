import { supabase } from "../supabase.js";

/**
 * Chama a função serverless /api/chatWithAI (Vercel), que tenta a Groq
 * primeiro e cai para o Gemini (Google AI Studio) automaticamente em
 * caso de erro, limite de uso, ou quando a mensagem tem anexo (imagem,
 * PDF ou áudio - a Groq só processa texto). Groq e Gemini têm tier
 * gratuito de verdade, sem cartão. As chaves de API ficam só no servidor
 * (variáveis de ambiente da Vercel), nunca no cliente. A autenticação usa
 * o token de sessão do Supabase.
 */
export async function askAI(system, messages) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Faça login para usar o assistente.");
  }

  const res = await fetch("/api/chatWithAI", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.message || "Não foi possível falar com a IA agora.");
    if (err.error === "quota_exceeded") e.quotaExceeded = true;
    throw e;
  }

  const data = await res.json();
  return data.text;
}

export function parseJSONBlock(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}
