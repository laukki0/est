import React from "react";
import { Moon, Sun } from "lucide-react";
import { usePrefs, useT } from "../contexts/PrefsContext.jsx";

const LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export default function Settings() {
  const { prefs, updatePrefs } = usePrefs();
  const t = useT();

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("settings_title")}</h1>
          <p>{t("settings_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div className="card" style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginBottom: 10 }}>{t("settings_theme")}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn-ghost btn"
              style={prefs.theme === "dark" ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : undefined}
              onClick={() => updatePrefs({ theme: "dark" })}
            >
              <Moon size={16} />
              {t("settings_theme_dark")}
            </button>
            <button
              className="btn-ghost btn"
              style={prefs.theme === "light" ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : undefined}
              onClick={() => updatePrefs({ theme: "light" })}
            >
              <Sun size={16} />
              {t("settings_theme_light")}
            </button>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginBottom: 10 }}>{t("settings_language")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className="btn-ghost btn"
                style={prefs.language === l.code ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : undefined}
                onClick={() => updatePrefs({ language: l.code })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
