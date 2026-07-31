import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askAI, parseJSONBlock } from "../lib/aiClient.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";
import QuotaBanner from "./QuotaBanner.jsx";

function buildSystem(langInstruction) {
  return `Você é o Cohort, especialista em ajudar estudantes a montar repertório sociocultural para redações (estilo ENEM e vestibulares). Traga sugestões reais e verificáveis (livros e filmes que de fato existem), nunca invente títulos. ${langInstruction}`;
}

export default function Repertorio() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();
  const [tema, setTema] = useState("");
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TEMAS_SUGERIDOS = [
    t("tema_meio_ambiente"),
    t("tema_tecnologia"),
    t("tema_desigualdade"),
    t("tema_saude_mental"),
    t("tema_democracia"),
  ];

  async function generate(temaEscolhido) {
    const tm = (temaEscolhido ?? tema).trim();
    if (!tm || loading) return;
    setTema(tm);
    setLoading(true);
    setError("");
    try {
      const prompt = `Sugira repertório sociocultural (livros e filmes reais) sobre o tema "${tm}", para uso em redações estilo ENEM. Traga 4 livros e 4 filmes.\n\nResponda APENAS com um JSON válido, sem markdown, sem texto adicional, exatamente neste formato:\n[{"tipo": "livro", "titulo": "...", "autor": "...", "ano": "...", "porque_usar": "..."}, {"tipo": "filme", "titulo": "...", "autor": "diretor...", "ano": "...", "porque_usar": "..."}]`;
      const raw = await askAI(buildSystem(langInstruction), [{ role: "user", content: prompt }]);
      const parsed = parseJSONBlock(raw);
      setItens(parsed);
    } catch (err) {
      setError(err?.quotaExceeded ? "quota" : t("repertorio_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("repertorio_title")}</h1>
          <p>{t("repertorio_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder={t("repertorio_placeholder")}
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
          <button className="btn" onClick={() => generate()} disabled={loading || !tema.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {t("repertorio_button")}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TEMAS_SUGERIDOS.map((tm) => (
            <button key={tm} className="btn-ghost btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => generate(tm)}>
              {tm}
            </button>
          ))}
        </div>

        {error === "quota" ? <QuotaBanner /> : error && <div className="empty">{error}</div>}

        {itens.length > 0 && (
          <div className="repertorio-grid">
            {itens.map((item, i) => (
              <div key={i} className="rep-card">
                <span className={`rep-tag ${item.tipo}`}>{item.tipo}</span>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{item.titulo}</div>
                <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 8 }}>
                  {item.autor} {item.ano ? `· ${item.ano}` : ""}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{item.porque_usar}</div>
              </div>
            ))}
          </div>
        )}
        {itens.length === 0 && !loading && <div className="empty">{t("repertorio_empty")}</div>}
      </div>
    </>
  );
}
