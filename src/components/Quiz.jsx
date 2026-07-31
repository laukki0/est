import React, { useRef, useState } from "react";
import { Check, Loader2, Paperclip, RotateCcw, Sparkles, X } from "lucide-react";
import { askAI, parseJSONBlock } from "../lib/aiClient.js";
import { useStats } from "../lib/useStats.js";
import { logActivity } from "../lib/useActivities.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";
import {
  ATTACHMENT_ACCEPT,
  attachmentsToBlocks,
  filesToAttachments,
} from "../lib/attachments.js";
import AttachmentChips from "./AttachmentChips.jsx";
import QuotaBanner from "./QuotaBanner.jsx";
import ShareResultButton from "./ShareResultButton.jsx";

function buildSystem(langInstruction) {
  return `Você é o Cohort, um tutor de estudos que ajuda estudantes a revisar conteúdo para provas. ${langInstruction}`;
}

const JSON_FORMAT_INSTRUCTION =
  'Responda APENAS com um JSON válido, sem markdown, sem texto adicional, exatamente neste formato:\n[{"pergunta": "...", "opcoes": ["...","...","...","..."], "correta": 0, "explicacao": "..."}]';

export default function Quiz() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();
  const [topic, setTopic] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const { registrarResposta } = useStats();
  const fileRef = useRef(null);

  async function handleFiles(e) {
    const { accepted, rejected } = await filesToAttachments(e.target.files);
    setAttachments((cur) => [...cur, ...accepted]);
    if (rejected.length) {
      setError(
        rejected
          .map((r) => t(r.reason === "too_large" ? "attach_too_large" : "attach_unsupported", { name: r.name }))
          .join(" ")
      );
    }
    e.target.value = "";
  }

  function removeAttachment(id) {
    setAttachments((cur) => {
      const target = cur.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return cur.filter((a) => a.id !== id);
    });
  }

  async function generate() {
    if ((!topic.trim() && attachments.length === 0) || loading) return;
    setLoading(true);
    setError("");
    try {
      const instruction =
        attachments.length > 0
          ? `Crie um quiz de 5 questões de múltipla escolha sobre o conteúdo do material anexado${
              topic.trim() ? `, com foco em: ${topic.trim()}` : ""
            }, para um estudante revisar antes de uma prova. Cada questão deve ter 4 alternativas, só uma correta, e uma explicação curta da resposta certa.\n\n${JSON_FORMAT_INSTRUCTION}`
          : `Crie um quiz de 5 questões de múltipla escolha sobre o tema/conteúdo abaixo, para um estudante revisar antes de uma prova. Cada questão deve ter 4 alternativas, só uma correta, e uma explicação curta da resposta certa.\n\nTema/conteúdo:\n${topic}\n\n${JSON_FORMAT_INSTRUCTION}`;

      const content =
        attachments.length > 0
          ? [...attachmentsToBlocks(attachments), { type: "text", text: instruction }]
          : instruction;

      const raw = await askAI(buildSystem(langInstruction), [{ role: "user", content }]);
      const parsed = parseJSONBlock(raw);
      setQuestions(parsed);
      setIndex(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
    } catch (err) {
      setError(err?.quotaExceeded ? "quota" : t("quiz_error"));
    } finally {
      setLoading(false);
    }
  }

  function choose(i) {
    if (selected !== null) return;
    setSelected(i);
    const correta = i === questions[index].correta;
    if (correta) setScore((s) => s + 1);
    registrarResposta(correta);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      logActivity("quiz_completed", { score, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function restart() {
    setQuestions([]);
    setAttachments([]);
    setFinished(false);
    setTopic("");
  }

  const q = questions[index];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("quiz_title")}</h1>
          <p>{t("quiz_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {questions.length === 0 && (
          <>
            <AttachmentChips attachments={attachments} onRemove={removeAttachment} />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="attach-btn"
                title={t("quiz_attach_tooltip")}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                onChange={handleFiles}
                style={{ display: "none" }}
              />
              <input
                className="input"
                placeholder={t("quiz_placeholder")}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
              <button
                className="btn"
                onClick={generate}
                disabled={loading || (!topic.trim() && attachments.length === 0)}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {t("quiz_button")}
              </button>
            </div>
            {error === "quota" ? <QuotaBanner /> : error && <div className="empty">{error}</div>}
            {!loading && <div className="empty">{t("quiz_empty")}</div>}
          </>
        )}

        {questions.length > 0 && !finished && q && (
          <>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--chalk-dim)" }}>
              {t("quiz_question_of", { n: index + 1, total: questions.length })}
            </div>
            <div className="card">
              <div style={{ fontSize: 16, marginBottom: 14 }}>{q.pergunta}</div>
              {q.opcoes.map((op, i) => {
                let cls = "quiz-opt";
                if (selected !== null) {
                  if (i === q.correta) cls += " correct";
                  else if (i === selected) cls += " wrong";
                }
                return (
                  <button key={i} className={cls} onClick={() => choose(i)} disabled={selected !== null}>
                    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {op}
                      {selected !== null && i === q.correta && <Check size={16} color="#9FCB8D" />}
                      {selected !== null && i === selected && i !== q.correta && <X size={16} color="#E8836E" />}
                    </span>
                  </button>
                );
              })}
              {selected !== null && (
                <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginTop: 8 }}>{q.explicacao}</div>
              )}
            </div>
            {selected !== null && (
              <div>
                <button className="btn" onClick={next}>
                  {index + 1 >= questions.length ? t("quiz_result") : t("quiz_next")}
                </button>
              </div>
            )}
          </>
        )}

        {finished && (
          <div className="card" style={{ textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 30 }}>
              {t("quiz_score", { score, total: questions.length })}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={restart}>
                <RotateCcw size={16} />
                {t("quiz_restart")}
              </button>
              <ShareResultButton
                title={t("share_quiz_title", { total: questions.length })}
                statValue={`${score}/${questions.length}`}
                statLabel={t("share_quiz_label")}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
