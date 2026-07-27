import React from "react";
import { FileText, Music, X } from "lucide-react";

export default function AttachmentChips({ attachments, onRemove }) {
  if (!attachments.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {attachments.map((a) => (
        <div key={a.id} className="attach-chip">
          {a.previewUrl ? (
            <img src={a.previewUrl} alt="" />
          ) : a.mediaType.startsWith("audio/") ? (
            <Music size={14} />
          ) : (
            <FileText size={14} />
          )}
          <span>{a.name}</span>
          <button type="button" onClick={() => onRemove(a.id)} aria-label="remove">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
