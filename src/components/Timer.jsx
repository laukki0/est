import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Save } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStudySessions } from "../lib/useStudySessions.js";
import { useT, useWeekdays } from "../contexts/PrefsContext.jsx";

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function Timer() {
  const t = useT();
  const weekdays = useWeekdays();
  const { salvarSessao, porDia, porMateria, totalSemana } = useStudySessions();

  const MATERIAS = [
    t("materia_matematica"),
    t("materia_portugues"),
    t("materia_historia"),
    t("materia_biologia"),
    t("materia_fisica"),
    t("materia_quimica"),
    t("materia_redacao"),
  ];

  const [materia, setMateria] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function start() {
    if (!materia.trim()) return;
    setRunning(true);
  }

  async function saveAndStop() {
    setRunning(false);
    await salvarSessao(materia.trim(), elapsed);
    setElapsed(0);
  }

  function discard() {
    setRunning(false);
    setElapsed(0);
  }

  const chartData = weekdays.map((dia, i) => ({ dia, minutos: porDia[i] }));
  const totalMin = Math.round(totalSemana / 60);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("timer_title")}</h1>
          <p>{t("timer_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        <input
          className="input"
          placeholder={t("timer_subject_placeholder")}
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          disabled={running}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MATERIAS.map((m) => (
            <button
              key={m}
              className="btn-ghost btn"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setMateria(m)}
              disabled={running}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
          <div className="mono" style={{ fontSize: 48, fontWeight: 700 }}>
            {formatTime(elapsed)}
          </div>
          {!materia.trim() && !running && (
            <div className="empty" style={{ marginTop: 6 }}>
              {t("timer_need_subject")}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            {!running && elapsed === 0 && (
              <button className="btn" onClick={start} disabled={!materia.trim()}>
                <Play size={16} />
                {t("timer_start")}
              </button>
            )}
            {running && (
              <button className="btn" onClick={() => setRunning(false)}>
                <Pause size={16} />
                {t("timer_pause")}
              </button>
            )}
            {!running && elapsed > 0 && (
              <button className="btn" onClick={() => setRunning(true)}>
                <Play size={16} />
                {t("timer_resume")}
              </button>
            )}
            {elapsed > 0 && (
              <>
                <button className="btn" onClick={saveAndStop}>
                  <Save size={16} />
                  {t("timer_save")}
                </button>
                <button className="btn-ghost btn" onClick={discard}>
                  <RotateCcw size={16} />
                  {t("timer_discard")}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="hand" style={{ fontSize: 20 }}>
              {t("timer_week_title")}
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--chalk-dim)" }}>
              {totalMin} min · {t("timer_total_week")}
            </div>
          </div>
          {totalSemana === 0 ? (
            <div className="empty">{t("timer_week_empty")}</div>
          ) : (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="dia" stroke="var(--chalk-dim)" fontSize={12} />
                  <YAxis stroke="var(--chalk-dim)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--board-panel)", border: "none", borderRadius: 8, color: "var(--chalk)" }}
                  />
                  <Bar dataKey="minutos" fill="var(--chalk-yellow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {porMateria.length > 0 && (
          <div className="card">
            <div className="hand" style={{ fontSize: 20, marginBottom: 10 }}>
              {t("timer_by_subject")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {porMateria.map((m) => (
                <div key={m.materia} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>{m.materia}</span>
                  <span className="mono" style={{ color: "var(--chalk-dim)" }}>
                    {m.minutos} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
