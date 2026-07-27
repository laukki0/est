import React, { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useStats } from "../lib/useStats.js";
import { logActivity } from "../lib/useActivities.js";

// Gera perguntas localmente - sem chamada de IA, resposta instantânea e
// funciona offline (bom pro Android sem internet no momento do treino).
function gerarTabuada(max, qtd) {
  const arr = [];
  for (let i = 0; i < qtd; i++) {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    arr.push({ enunciado: `${a} × ${b}`, resposta: a * b });
  }
  return arr;
}

function gerarRaizes(max, qtd) {
  const arr = [];
  for (let i = 0; i < qtd; i++) {
    const base = Math.floor(Math.random() * max) + 1;
    const quadrado = base * base;
    const perguntarRaiz = Math.random() < 0.5;
    arr.push(
      perguntarRaiz
        ? { enunciado: `√${quadrado}`, resposta: base }
        : { enunciado: `${base}²`, resposta: quadrado }
    );
  }
  return arr;
}

const RANGES = [5, 10, 12, 15];
const QUANTIDADES = [5, 10, 15, 20];

export default function Drills() {
  const t = useT();
  const { registrarRespostaDrill } = useStats();

  const [mode, setMode] = useState("mult");
  const [range, setRange] = useState(10);
  const [qtd, setQtd] = useState(10);

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  function start() {
    const gerador = mode === "mult" ? gerarTabuada : gerarRaizes;
    setQuestions(gerador(range, qtd));
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFinished(false);
  }

  function reiniciar() {
    setQuestions([]);
    setFinished(false);
  }

  function confirmar() {
    if (feedback || answer.trim() === "") return;
    const q = questions[index];
    const correta = Number(answer) === q.resposta;
    setFeedback({ correta, resposta: q.resposta });
    registrarRespostaDrill(correta);
    const finalScore = correta ? score + 1 : score;
    if (correta) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setFinished(true);
        logActivity("drill_completed", { mode, score: finalScore, total: questions.length });
      } else {
        setIndex((i) => i + 1);
        setAnswer("");
        setFeedback(null);
      }
    }, 900);
  }

  const q = questions[index];
  const emTreino = questions.length > 0 && !finished;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("drills_title")}</h1>
          <p>{t("drills_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {questions.length === 0 && !finished && (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-ghost btn"
                style={{ opacity: mode === "mult" ? 1 : 0.5 }}
                onClick={() => setMode("mult")}
              >
                {t("drills_mode_mult")}
              </button>
              <button
                className="btn-ghost btn"
                style={{ opacity: mode === "root" ? 1 : 0.5 }}
                onClick={() => setMode("root")}
              >
                {t("drills_mode_root")}
              </button>
            </div>

            <div>
              <div className="empty" style={{ marginBottom: 6 }}>
                {t("drills_range_label")}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RANGES.map((r) => (
                  <button
                    key={r}
                    className="btn-ghost btn"
                    style={{ fontSize: 12, padding: "6px 12px", opacity: range === r ? 1 : 0.5 }}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="empty" style={{ marginBottom: 6 }}>
                {t("drills_questions_label")}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {QUANTIDADES.map((n) => (
                  <button
                    key={n}
                    className="btn-ghost btn"
                    style={{ fontSize: 12, padding: "6px 12px", opacity: qtd === n ? 1 : 0.5 }}
                    onClick={() => setQtd(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button className="btn" onClick={start}>
                {t("drills_start")}
              </button>
            </div>
          </>
        )}

        {emTreino && q && (
          <>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <div
              className="mono"
              style={{ fontSize: 12, color: "var(--chalk-dim)", display: "flex", justifyContent: "space-between" }}
            >
              <span>
                {index + 1} / {questions.length}
              </span>
              <span>
                {t("drills_streak")}: {streak} · {t("drills_best_streak")}: {bestStreak}
              </span>
            </div>
            <div className="card" style={{ textAlign: "center", padding: "32px 18px" }}>
              <div className="hand" style={{ fontSize: 48, marginBottom: 18 }}>
                {q.enunciado} = ?
              </div>
              <input
                className="input"
                style={{ maxWidth: 160, margin: "0 auto", textAlign: "center", fontSize: 20 }}
                inputMode="numeric"
                placeholder={t("drills_answer_placeholder")}
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmar()}
                disabled={!!feedback}
              />
              <div style={{ marginTop: 14 }}>
                {!feedback && (
                  <button className="btn" onClick={confirmar} disabled={answer.trim() === ""}>
                    {t("drills_confirm")}
                  </button>
                )}
                {feedback && (
                  <div
                    className="hand"
                    style={{
                      fontSize: 22,
                      color: feedback.correta ? "var(--chalk-green)" : "var(--chalk-coral)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {feedback.correta ? <Check size={22} /> : <X size={22} />}
                    {feedback.correta ? t("drills_correct") : t("drills_wrong", { answer: feedback.resposta })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {finished && (
          <div className="card" style={{ textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 20, marginBottom: 4 }}>
              {t("drills_result_title")}
            </div>
            <div className="hand" style={{ fontSize: 34 }}>
              {score} / {questions.length}
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--chalk-dim)", marginTop: 6 }}>
              {t("drills_best_streak")}: {bestStreak}
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={reiniciar}>
                <RotateCcw size={16} />
                {t("drills_restart")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
