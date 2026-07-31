import React, { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { buildResultCard, shareOrDownloadImage } from "../lib/shareCard.js";

export default function ShareResultButton({ title, statValue, statLabel }) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const blob = await buildResultCard({
        appName: t("app_name"),
        title,
        statValue: String(statValue),
        statLabel,
        footer: t("share_footer"),
      });
      await shareOrDownloadImage(blob, "resultado.png");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-ghost btn" onClick={handleShare} disabled={loading}>
      {loading ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />}
      {t("share_result_button")}
    </button>
  );
}
