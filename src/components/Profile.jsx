import React, { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePrefs, useT } from "../contexts/PrefsContext.jsx";
import { useStats } from "../lib/useStats.js";

export default function Profile() {
  const t = useT();
  const { user } = useAuth();
  const { prefs, updatePrefs } = usePrefs();
  const { stats } = useStats();
  const [name, setName] = useState(prefs.display_name || "");
  const [preview, setPreview] = useState(prefs.photo_url || "");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const accuracy =
    stats.questionsAnswered > 0
      ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
      : null;

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let photoUrl = prefs.photo_url;
      if (file) {
        const path = `${user.id}/avatar.${file.name.split(".").pop() || "jpg"}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        // cache-bust pra foto nova aparecer na hora, já que o path é fixo
        photoUrl = `${data.publicUrl}?t=${Date.now()}`;
      }
      await updatePrefs({ display_name: name.trim(), photo_url: photoUrl });
      setMessage(t("profile_saved"));
    } catch {
      setError(t("profile_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("profile_title")}</h1>
          <p>{t("profile_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 360 }}
        >
          <img
            src={preview || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(name || "?")}
            alt=""
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
          />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
          <button className="btn-ghost btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            {t("profile_change_photo")}
          </button>

          <div style={{ width: "100%" }}>
            <label style={{ fontSize: 13, color: "var(--chalk-dim)", display: "block", marginBottom: 6 }}>
              {t("profile_name_label")}
            </label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <button
            className="btn"
            onClick={save}
            disabled={saving || !name.trim()}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {t("profile_save")}
          </button>
          {message && <div style={{ fontSize: 13, color: "var(--chalk-green)" }}>{message}</div>}
          {error && <div className="empty">{error}</div>}
        </div>

        <div>
          <h2 className="hand" style={{ fontSize: 22, margin: "8px 0 2px" }}>
            {t("stats_title")}
          </h2>
          <p className="empty" style={{ marginBottom: 14 }}>
            {t("stats_subtitle")}
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="value">{stats.flashcardsViewed}</div>
              <div className="label">{t("stats_flashcards")}</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.correctAnswers}</div>
              <div className="label">{t("stats_correct")}</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.questionsAnswered}</div>
              <div className="label">{t("stats_answered")}</div>
            </div>
            <div className="stat-card">
              <div className="value">{accuracy !== null ? `${accuracy}%` : "—"}</div>
              <div className="label">{t("stats_accuracy")}</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.drillsCorrect}</div>
              <div className="label">{t("stats_drills_correct")}</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.drillsAnswered}</div>
              <div className="label">{t("stats_drills_total")}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
