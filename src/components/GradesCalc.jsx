import React, { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";

let nextId = 1;
function newRow() {
  return { id: nextId++, name: "", grade: "", credits: "1" };
}

export default function GradesCalc() {
  const t = useT();

  const [rows, setRows] = useState([newRow(), newRow(), newRow()]);

  const [totalClasses, setTotalClasses] = useState("");
  const [minAttendance, setMinAttendance] = useState("75");
  const [absences, setAbsences] = useState("");

  function updateRow(id, field, value) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(id) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const validRows = rows.filter((r) => r.grade !== "" && !Number.isNaN(Number(r.grade)));
  const totalCredits = validRows.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
  const weightedSum = validRows.reduce((sum, r) => sum + Number(r.grade) * (Number(r.credits) || 0), 0);
  const cr = totalCredits > 0 ? weightedSum / totalCredits : null;

  const total = Number(totalClasses) || 0;
  const minPct = Number(minAttendance) || 0;
  const faltas = Number(absences) || 0;
  const hasFrequencyInput = total > 0;
  const maxFaltas = hasFrequencyInput ? Math.floor(total * (1 - minPct / 100)) : 0;
  const faltasRestantes = maxFaltas - faltas;
  const attendancePct = hasFrequencyInput ? ((total - faltas) / total) * 100 : null;
  const reprovadoPorFalta = hasFrequencyInput && faltas > maxFaltas;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("grades_title")}</h1>
          <p>{t("grades_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="hand" style={{ fontSize: 20, marginBottom: 2 }}>
            {t("grades_cr_title")}
          </div>
          <div className="empty" style={{ marginBottom: 14 }}>
            {t("grades_cr_subtitle")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--chalk-dim)", paddingLeft: 2 }}>
              <span style={{ flex: 1 }}>{t("grades_subject_label")}</span>
              <span style={{ width: 90 }}>{t("grades_grade_label")}</span>
              <span style={{ width: 90 }}>{t("grades_credits_label")}</span>
              <span style={{ width: 32 }} />
            </div>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={t("grades_subject_placeholder")}
                  value={r.name}
                  onChange={(e) => updateRow(r.id, "name", e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.1"
                  style={{ width: 90 }}
                  value={r.grade}
                  onChange={(e) => updateRow(r.id, "grade", e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="1"
                  style={{ width: 90 }}
                  value={r.credits}
                  onChange={(e) => updateRow(r.id, "credits", e.target.value)}
                />
                <button className="btn-ghost btn" style={{ width: 32, padding: 6 }} onClick={() => removeRow(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="btn-ghost btn" onClick={addRow}>
              <Plus size={14} />
              {t("grades_add_subject")}
            </button>
          </div>

          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-card">
              <div className="value">{cr !== null ? cr.toFixed(2) : "–"}</div>
              <div className="label">{t("grades_cr_result")}</div>
            </div>
          </div>
          <div className="empty" style={{ marginTop: 10, fontSize: 12 }}>
            {t("grades_cr_note")}
          </div>
        </div>

        <div className="card">
          <div className="hand" style={{ fontSize: 20, marginBottom: 2 }}>
            {t("grades_attendance_title")}
          </div>
          <div className="empty" style={{ marginBottom: 14 }}>
            {t("grades_attendance_subtitle")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 200, fontSize: 13, flexShrink: 0 }}>{t("grades_total_classes_label")}</span>
              <input
                className="input"
                type="number"
                min={0}
                value={totalClasses}
                onChange={(e) => setTotalClasses(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 200, fontSize: 13, flexShrink: 0 }}>{t("grades_min_attendance_label")}</span>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={minAttendance}
                onChange={(e) => setMinAttendance(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 200, fontSize: 13, flexShrink: 0 }}>{t("grades_absences_label")}</span>
              <input
                className="input"
                type="number"
                min={0}
                value={absences}
                onChange={(e) => setAbsences(e.target.value)}
              />
            </div>
          </div>

          {hasFrequencyInput && (
            <>
              <div className="stat-grid" style={{ marginTop: 16 }}>
                <div className="stat-card">
                  <div className="value" style={{ color: reprovadoPorFalta ? "var(--chalk-coral)" : "var(--chalk-yellow)" }}>
                    {attendancePct.toFixed(1)}%
                  </div>
                  <div className="label">{t("grades_current_attendance")}</div>
                </div>
                <div className="stat-card">
                  <div className="value" style={{ color: faltasRestantes < 0 ? "var(--chalk-coral)" : "var(--chalk-green)" }}>
                    {Math.max(0, faltasRestantes)}
                  </div>
                  <div className="label">{t("grades_absences_remaining")}</div>
                </div>
              </div>

              {reprovadoPorFalta ? (
                <div
                  className="card"
                  style={{ marginTop: 14, borderLeft: "3px solid var(--chalk-coral)", display: "flex", gap: 10 }}
                >
                  <AlertTriangle size={18} color="var(--chalk-coral)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 13 }}>{t("grades_over_limit_warning")}</div>
                </div>
              ) : (
                <div className="empty" style={{ marginTop: 10, fontSize: 12 }}>
                  {t("grades_max_absences_note", { max: maxFaltas })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
