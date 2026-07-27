import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askAI } from "../lib/aiClient.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";

function buildSystem(langInstruction) {
  return `Você é o Estuda+, um tutor de estudos que ajuda estudantes a revisar conteúdo para provas. ${langInstruction}`;
}

export default function Resumo() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const prompt = `Resuma o conteúdo de estudo abaixo em tópicos curtos e objetivos, destacando o que é mais importante para uma prova. Uma ideia por linha, cada linha começando com "- ". Sem introdução nem conclusão, só os tópicos.\n\nConteúdo:\n${text}`;
      const result = await askAI(buildSystem(langInstruction), [{ role: "user", content: prompt }]);
      setSummary(result.trim());
    } catch {
      setError(t("resumo_error"));
    } finally {
      setLoading(false);
    }
  }

  const lines = summary
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("resumo_title")}</h1>
          <p>{t("resumo_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <textarea
          className="textarea"
          rows={7}
          placeholder={t("resumo_placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <button className="btn" onClick={generate} disabled={loading || !text.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {t("resumo_button")}
          </button>
        </div>
        {error && <div className="empty">{error}</div>}
        {lines.length > 0 && (
          <div className="card">
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {lines.map((l, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!summary && !loading && <div className="empty">{t("resumo_empty")}</div>}
      </div>
    </>
  );
}
