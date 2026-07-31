import React, { useState } from "react";
import { AlertTriangle, Anchor, ChevronDown, GraduationCap, Landmark, Plane, Shield } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { EXAMS, MILITARY_GROUP_LABELS } from "../lib/examsData.js";

const MILITARY_ICON = { exercito: Shield, marinha: Anchor, aeronautica: Plane };

function ExamCard({ exam }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const Icon = exam.categoria === "militar" ? MILITARY_ICON[exam.grupo] : Landmark;
  const groupLabel = exam.categoria === "militar" ? MILITARY_GROUP_LABELS[exam.grupo] : exam.grupo;

  return (
    <div className="card">
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon size={20} color="#F2C94C" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {exam.sigla} <span style={{ fontWeight: 400 }}>— {exam.nome}</span>
          </div>
          <div className="empty" style={{ fontSize: 12, marginTop: 2 }}>
            {groupLabel} · {exam.nivel === "medio" ? t("exams_level_medio") : t("exams_level_superior")} · {exam.cidade}
          </div>
        </div>
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 4 }}>{t("exams_career")}</div>
            <div style={{ fontSize: 14 }}>{exam.carreira}</div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 4 }}>{t("exams_age")}</div>
              <div style={{ fontSize: 14 }}>{exam.idade}</div>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 4 }}>{t("exams_schooling")}</div>
              <div style={{ fontSize: 14 }}>{exam.escolaridade}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 6 }}>{t("exams_subjects")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {exam.materias.map((m) => (
                <span
                  key={m}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 6 }}>{t("exams_stages")}</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              {exam.etapas.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ol>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 4 }}>{t("exams_vacancies")}</div>
            <div style={{ fontSize: 14 }}>{exam.vagasRecentes}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginBottom: 4 }}>{t("exams_dates")}</div>
            <div style={{ fontSize: 14 }}>{exam.datasRecentes}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Exams() {
  const t = useT();
  const [categoria, setCategoria] = useState("militar");
  const [subFilter, setSubFilter] = useState("todas");

  const inCategoria = EXAMS.filter((e) => e.categoria === categoria);
  const subOptions =
    categoria === "militar"
      ? ["todas", "exercito", "marinha", "aeronautica"]
      : ["todas", ...Array.from(new Set(inCategoria.map((e) => e.grupo)))];
  const filtered = subFilter === "todas" ? inCategoria : inCategoria.filter((e) => e.grupo === subFilter);

  function subLabel(f) {
    if (f === "todas") return t("exams_filter_all");
    return categoria === "militar" ? MILITARY_GROUP_LABELS[f] : f;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("exams_title")}</h1>
          <p>{t("exams_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: "rgba(242, 201, 76, 0.12)",
            border: "1px solid rgba(242, 201, 76, 0.35)",
          }}
        >
          <AlertTriangle size={16} color="#F2C94C" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t("exams_disclaimer")}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-ghost btn"
            style={{
              flex: 1,
              justifyContent: "center",
              ...(categoria === "militar" ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : {}),
            }}
            onClick={() => {
              setCategoria("militar");
              setSubFilter("todas");
            }}
          >
            <Shield size={15} />
            {t("exams_category_military")}
          </button>
          <button
            className="btn-ghost btn"
            style={{
              flex: 1,
              justifyContent: "center",
              ...(categoria === "tradicional" ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : {}),
            }}
            onClick={() => {
              setCategoria("tradicional");
              setSubFilter("todas");
            }}
          >
            <GraduationCap size={15} />
            {t("exams_category_traditional")}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {subOptions.map((f) => (
            <button
              key={f}
              className="btn-ghost btn"
              style={{
                fontSize: 12,
                padding: "6px 12px",
                ...(subFilter === f ? { borderColor: "var(--chalk-yellow)", color: "var(--chalk-yellow)" } : {}),
              }}
              onClick={() => setSubFilter(f)}
            >
              {subLabel(f)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      </div>
    </>
  );
}
