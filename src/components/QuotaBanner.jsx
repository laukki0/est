import React from "react";
import { Sparkles } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";

export default function QuotaBanner() {
  const t = useT();
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, borderColor: "var(--chalk-yellow)" }}>
      <Sparkles size={18} color="var(--chalk-yellow)" style={{ flexShrink: 0 }} />
      <div style={{ fontSize: 14 }}>{t("quota_banner_message")}</div>
    </div>
  );
}
