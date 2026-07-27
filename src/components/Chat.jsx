import React, { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Music, Paperclip, Send } from "lucide-react";
import { askAI } from "../lib/aiClient.js";
import { useT, useAiLanguageInstruction } from "../contexts/PrefsContext.jsx";
import {
  ATTACHMENT_ACCEPT,
  attachmentsToBlocks,
  filesToAttachments,
} from "../lib/attachments.js";
import AttachmentChips from "./AttachmentChips.jsx";

function buildSystem(langInstruction) {
  return `Você é o Estuda+, um tutor de estudos paciente e didático que ajuda estudantes a se prepararem para provas. Quando o aluno enviar uma imagem, PDF ou áudio, analise o conteúdo enviado e ajude a entender ou resolver o que está nele. Explique conceitos com clareza, use exemplos quando ajudar, seja direto e encorajador. ${langInstruction}`;
}

function MessageBody({ content }) {
  if (typeof content === "string") return content;
  const textBlock = content.find((b) => b.type === "text");
  const fileBlocks = content.filter((b) => b.type === "file" || b.type === "image");
  return (
    <>
      {fileBlocks.length > 0 && (
        <div className="bubble-attachments">
          {fileBlocks.map((b, i) =>
            b.source.media_type.startsWith("image/") ? (
              <img key={i} src={`data:${b.source.media_type};base64,${b.source.data}`} alt="" />
            ) : (
              <div key={i} className="file-chip">
                {b.source.media_type.startsWith("audio/") ? <Music size={20} /> : <FileText size={20} />}
              </div>
            )
          )}
        </div>
      )}
      {textBlock?.text}
    </>
  );
}

export default function Chat() {
  const t = useT();
  const langInstruction = useAiLanguageInstruction();
  const [messages, setMessages] = useState([{ role: "assistant", content: t("chat_intro") }]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function handleFiles(e) {
    const { accepted, rejected } = await filesToAttachments(e.target.files);
    setAttachments((cur) => [...cur, ...accepted]);
    if (rejected.length) {
      setError(
        rejected
          .map((r) => t(r.reason === "too_large" ? "attach_too_large" : "attach_unsupported", { name: r.name }))
          .join(" ")
      );
    } else {
      setError("");
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

  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    const content =
      attachments.length > 0
        ? [...attachmentsToBlocks(attachments), { type: "text", text: text || t("chat_attach_default_question") }]
        : text;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setError("");
    try {
      const reply = await askAI(buildSystem(langInstruction), next);
      setMessages((cur) => [...cur, { role: "assistant", content: reply.trim() }]);
    } catch {
      setError(t("chat_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("chat_title")}</h1>
          <p>{t("chat_subtitle")}</p>
        </div>
      </div>
      <div className="content" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <MessageBody content={m.content} />
          </div>
        ))}
        {loading && (
          <div className="bubble assistant" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={14} className="spin" /> {t("chat_thinking")}
          </div>
        )}
        {error && <div className="empty">{error}</div>}
      </div>
      <div
        style={{
          padding: "10px 26px 14px",
          borderTop: "1px dashed var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <AttachmentChips attachments={attachments} onRemove={removeAttachment} />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="attach-btn"
            title={t("chat_attach_tooltip")}
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
            placeholder={t("chat_placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn" onClick={send} disabled={loading}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
