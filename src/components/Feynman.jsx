import React, { useState } from "react";
import { Brain, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { askAI } from "../lib/aiClient.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";
import QuotaBanner from "./QuotaBanner.jsx";

function buildSystem(langInstruction) {
  return `Você é o Cohort, um tutor que aplica a Técnica de Feynman para revisão de estudos: o estudante escolhe um assunto e tenta explicá-lo em palavras simples, como se estivesse ensinando alguém que não sabe nada sobre o tema. Sua tarefa é ler a explicação do estudante e dar um retorno curto e construtivo, sempre nesta estrutura, sem introdução:

Pontos fortes: (1-2 frases sobre o que ficou bem explicado)
Lacunas ou imprecisões: (aponte o que ficou vago, incorreto ou incompleto - se não houver nenhuma, diga que a explicação está sólida)
Termos técnicos não explicados: (liste palavras que o estudante usou sem explicar em termos simples - se não houver, diga que não usou jargão sem explicar)
Pergunta pra te desafiar: (uma pergunta específica que testa se o estudante realmente entende, não só decorou)

Seja direto, encorajador e específico ao assunto - nunca dê feedback genérico que serviria pra qualquer explicação. ${langInstruction}`;
}

export default function Feynman() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();

  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!topic.trim() || !explanation.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const prompt = `Assunto escolhido pelo estudante: "${topic.trim()}"\n\nExplicação do estudante (tentativa ${attempts.length + 1}):\n${explanation.trim()}`;
      const feedback = await askAI(buildSystem(langInstruction), [{ role: "user", content: prompt }]);
      setAttempts((prev) => [...prev, { explanation: explanation.trim(), feedback: feedback.trim() }]);
      setExplanation("");
    } catch (err) {
      setError(err?.quotaExceeded ? "quota" : t("feynman_error"));
    } finally {
      setLoading(false);
    }
  }

  function handleNewTopic() {
    setTopic("");
    setExplanation("");
    setAttempts([]);
    setError("");
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("feynman_title")}</h1>
          <p>{t("feynman_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {attempts.length === 0 ? (
          <input
            className="input"
            placeholder={t("feynman_topic_placeholder")}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="empty" style={{ fontSize: 12 }}>
                {t("feynman_topic_label")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{topic}</div>
            </div>
            <button className="btn-ghost btn" onClick={handleNewTopic}>
              <RotateCcw size={14} />
              {t("feynman_new_topic")}
            </button>
          </div>
        )}

        {attempts.map((a, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="empty" style={{ fontSize: 12 }}>
              {t("feynman_attempt_label", { n: i + 1 })}
            </div>
            <div className="bubble user" style={{ alignSelf: "flex-end" }}>
              {a.explanation}
            </div>
            <div className="bubble assistant" style={{ alignSelf: "flex-start", display: "flex", gap: 8 }}>
              <Brain size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--chalk-yellow)" }} />
              <span>{a.feedback}</span>
            </div>
          </div>
        ))}

        <textarea
          className="textarea"
          rows={6}
          placeholder={t("feynman_explanation_placeholder")}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          disabled={!topic.trim()}
        />
        <div>
          <button className="btn" onClick={handleSubmit} disabled={loading || !topic.trim() || !explanation.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {attempts.length === 0 ? t("feynman_button_first") : t("feynman_button_again")}
          </button>
        </div>
        {error === "quota" ? <QuotaBanner /> : error && <div className="empty">{error}</div>}
        {attempts.length === 0 && !topic.trim() && <div className="empty">{t("feynman_empty")}</div>}
      </div>
    </>
  );
}
