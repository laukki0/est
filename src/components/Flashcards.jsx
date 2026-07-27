import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { askAI, parseJSONBlock } from "../lib/aiClient.js";
import { useStats } from "../lib/useStats.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";

function buildSystem(langInstruction) {
  return `Você é o Estuda+, um tutor de estudos que ajuda estudantes a revisar conteúdo para provas. ${langInstruction}`;
}

export default function Flashcards() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { registrarFlashcardVisto } = useStats();
  const seenRef = useRef(new Set());

  async function generate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const prompt = `Crie 8 flashcards de estudo (pergunta curta e resposta curta) sobre o tema/conteúdo abaixo, ideais para revisão rápida antes de uma prova.\n\nTema/conteúdo:\n${topic}\n\nResponda APENAS com um JSON válido, sem markdown, sem texto adicional, exatamente neste formato:\n[{"pergunta": "...", "resposta": "..."}]`;
      const raw = await askAI(buildSystem(langInstruction), [{ role: "user", content: prompt }]);
      const parsed = parseJSONBlock(raw);
      setCards(parsed);
      setIndex(0);
      setFlipped(false);
      seenRef.current = new Set();
    } catch {
      setError(t("flashcards_error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cards.length) return;
    if (!seenRef.current.has(index)) {
      seenRef.current.add(index);
      registrarFlashcardVisto();
    }
  }, [index, cards]); // eslint-disable-line react-hooks/exhaustive-deps

  function go(delta) {
    setFlipped(false);
    setIndex((i) => Math.min(Math.max(i + delta, 0), cards.length - 1));
  }

  const card = cards[index];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("flashcards_title")}</h1>
          <p>{t("flashcards_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder={t("flashcards_placeholder")}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
          <button className="btn" onClick={generate} disabled={loading || !topic.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {t("flashcards_button")}
          </button>
        </div>
        {error && <div className="empty">{error}</div>}

        {card && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 8 }}>
            <div className="flip-wrap">
              <div className={`flip-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
                <div className="flip-face">
                  <span className="punch" style={{ top: 20 }} />
                  <span className="punch" style={{ top: "50%", marginTop: -5 }} />
                  <span className="punch" style={{ bottom: 20 }} />
                  <div className="rule" />
                  <div className="rule2" />
                  <div className="flip-label">{t("flashcards_question")}</div>
                  <div className="flip-text hand">{card.pergunta}</div>
                </div>
                <div className="flip-face flip-back">
                  <span className="punch" style={{ top: 20 }} />
                  <span className="punch" style={{ top: "50%", marginTop: -5 }} />
                  <span className="punch" style={{ bottom: 20 }} />
                  <div className="rule" />
                  <div className="rule2" />
                  <div className="flip-label back">{t("flashcards_answer")}</div>
                  <div className="flip-text hand">{card.resposta}</div>
                </div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--chalk-dim)" }}>
              {index + 1} / {cards.length} · {t("flashcards_hint")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost btn" onClick={() => go(-1)} disabled={index === 0}>
                <ChevronLeft size={16} />
              </button>
              <button className="btn-ghost btn" onClick={() => go(1)} disabled={index === cards.length - 1}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        {!card && !loading && <div className="empty">{t("flashcards_empty")}</div>}
      </div>
    </>
  );
}
