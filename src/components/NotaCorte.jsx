import React, { useState } from "react";
import { AlertTriangle, Scale } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import ShareResultButton from "./ShareResultButton.jsx";

const AREAS = ["linguagens", "humanas", "natureza", "matematica", "redacao"];
const ESTIMATOR_AREAS = ["linguagens", "humanas", "natureza", "matematica"];

const PRESETS = {
  igual: { linguagens: 1, humanas: 1, natureza: 1, matematica: 1, redacao: 1 },
  exatas: { linguagens: 1, humanas: 1, natureza: 2, matematica: 3, redacao: 2 },
  humanas: { linguagens: 2, humanas: 3, natureza: 1, matematica: 1, redacao: 2 },
  saude: { linguagens: 1, humanas: 1, natureza: 3, matematica: 1, redacao: 2 },
};

// ⚠️ Estimativa própria de ordem de grandeza, NÃO uma tabela oficial do
// INEP. Ancorada em poucos pontos de referência públicos (ex.: o "chão" de
// quem responde por chute em provas de 5 alternativas fica perto de
// ~300 pontos, e referências públicas de terceiros situam ~800 pontos por
// volta de 36-43 acertos, variando por área/ano). Interpolação linear
// simples entre esses pontos - a margem de erro real é grande, e o
// componente deixa isso explícito na interface.
const ANCHORS = [
  { acertos: 0, nota: 280 },
  { acertos: 9, nota: 330 },
  { acertos: 22, nota: 550 },
  { acertos: 36, nota: 750 },
  { acertos: 40, nota: 820 },
  { acertos: 45, nota: 920 },
];

function estimarNota(acertos) {
  const a = Math.max(0, Math.min(45, Number(acertos) || 0));
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const p0 = ANCHORS[i];
    const p1 = ANCHORS[i + 1];
    if (a >= p0.acertos && a <= p1.acertos) {
      const frac = (a - p0.acertos) / (p1.acertos - p0.acertos);
      return Math.round(p0.nota + frac * (p1.nota - p0.nota));
    }
  }
  return ANCHORS[ANCHORS.length - 1].nota;
}

function estimarFaixa(acertos) {
  const nota = estimarNota(acertos);
  return { min: Math.max(0, nota - 60), max: Math.min(1000, nota + 60) };
}

export default function NotaCorte() {
  const t = useT();

  const [scores, setScores] = useState({
    linguagens: "", humanas: "", natureza: "", matematica: "", redacao: "",
  });
  const [weights, setWeights] = useState(PRESETS.igual);
  const [preset, setPreset] = useState("igual");
  const [cutoff, setCutoff] = useState("");

  const [estArea, setEstArea] = useState("linguagens");
  const [estAcertos, setEstAcertos] = useState(20);

  function applyPreset(key) {
    setPreset(key);
    setWeights(PRESETS[key]);
  }

  function updateScore(area, value) {
    setScores((s) => ({ ...s, [area]: value }));
  }

  function updateWeight(area, value) {
    setPreset(null);
    setWeights((w) => ({ ...w, [area]: value }));
  }

  const totalWeight = AREAS.reduce((sum, a) => sum + (Number(weights[a]) || 0), 0);
  const weightedSum = AREAS.reduce(
    (sum, a) => sum + (Number(scores[a]) || 0) * (Number(weights[a]) || 0),
    0
  );
  const media = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const cutoffNum = cutoff === "" ? null : Number(cutoff);
  const diff = cutoffNum !== null ? Math.round(media - cutoffNum) : null;

  const faixa = estimarFaixa(estAcertos);

  function usarEstimativa() {
    updateScore(estArea, Math.round((faixa.min + faixa.max) / 2));
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("notacorte_title")}</h1>
          <p>{t("notacorte_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div
          className="card"
          style={{ borderLeft: "3px solid var(--chalk-coral)", display: "flex", gap: 12 }}
        >
          <AlertTriangle size={22} color="var(--chalk-coral)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="hand" style={{ fontSize: 20, marginBottom: 4 }}>
              {t("notacorte_tri_title")}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--chalk-dim)" }}>
              {t("notacorte_tri_text")}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hand" style={{ fontSize: 20, marginBottom: 2 }}>
            {t("notacorte_calc_title")}
          </div>
          <div className="empty" style={{ marginBottom: 14 }}>
            {t("notacorte_calc_subtitle")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AREAS.map((area) => (
              <div key={area} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 140, fontSize: 13, flexShrink: 0 }}>
                  {t(`notacorte_area_${area}`)}
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={1000}
                  placeholder={t("notacorte_score_label")}
                  value={scores[area]}
                  onChange={(e) => updateScore(area, e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.5"
                  style={{ width: 90, flexShrink: 0 }}
                  placeholder={t("notacorte_weight_label")}
                  value={weights[area]}
                  onChange={(e) => updateWeight(area, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="empty" style={{ marginBottom: 6 }}>
              {t("notacorte_preset_label")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(PRESETS).map((key) => (
                <button
                  key={key}
                  className="btn-ghost btn"
                  style={{ fontSize: 12, padding: "6px 12px", opacity: preset === key ? 1 : 0.5 }}
                  onClick={() => applyPreset(key)}
                >
                  {t(`notacorte_preset_${key}`)}
                </button>
              ))}
            </div>
            <div className="empty" style={{ marginTop: 6, fontSize: 12 }}>
              {t("notacorte_preset_note")}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <input
              className="input"
              type="number"
              min={0}
              max={1000}
              placeholder={t("notacorte_cutoff_label")}
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </div>

          <div
            className="stat-grid"
            style={{ marginTop: 16, gridTemplateColumns: cutoffNum !== null ? "1fr 1fr" : "1fr" }}
          >
            <div className="stat-card">
              <div className="value">{media.toFixed(1)}</div>
              <div className="label">{t("notacorte_your_average")}</div>
            </div>
            {cutoffNum !== null && (
              <div className="stat-card">
                <div className="value" style={{ color: diff >= 0 ? "var(--chalk-green)" : "var(--chalk-coral)" }}>
                  {diff >= 0 ? "+" : ""}
                  {diff}
                </div>
                <div className="label">
                  {diff >= 0
                    ? t("notacorte_above_cutoff", { diff: Math.abs(diff) })
                    : t("notacorte_below_cutoff", { diff: Math.abs(diff) })}
                </div>
              </div>
            )}
          </div>
          {media > 0 && (
            <div style={{ marginTop: 14 }}>
              <ShareResultButton
                title={t("share_notacorte_title")}
                statValue={media.toFixed(1)}
                statLabel={t("share_notacorte_label")}
              />
            </div>
          )}
        </div>

        <div className="card">
          <div className="hand" style={{ fontSize: 20, marginBottom: 2 }}>
            {t("notacorte_estimator_title")}
          </div>
          <div className="empty" style={{ marginBottom: 14 }}>
            {t("notacorte_estimator_subtitle")}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="empty" style={{ marginBottom: 6 }}>
              {t("notacorte_estimator_area_label")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ESTIMATOR_AREAS.map((area) => (
                <button
                  key={area}
                  className="btn-ghost btn"
                  style={{ fontSize: 12, padding: "6px 12px", opacity: estArea === area ? 1 : 0.5 }}
                  onClick={() => setEstArea(area)}
                >
                  {t(`notacorte_area_${area}`)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{t("notacorte_acertos_label")}</span>
            <input
              type="range"
              min={0}
              max={45}
              value={estAcertos}
              onChange={(e) => setEstAcertos(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span className="mono" style={{ width: 28, textAlign: "right" }}>
              {estAcertos}
            </span>
          </div>

          <div className="hand" style={{ fontSize: 24, marginTop: 12 }}>
            {t("notacorte_estimated_range", { min: faixa.min, max: faixa.max })}
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="btn-ghost btn" onClick={usarEstimativa}>
              <Scale size={14} />
              {t("notacorte_use_estimate")}
            </button>
          </div>

          <div className="empty" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6 }}>
            {t("notacorte_estimator_disclaimer")}
          </div>
        </div>
      </div>
    </>
  );
}
