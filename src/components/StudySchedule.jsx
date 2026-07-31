import React, { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useSchedule } from "../lib/useSchedule.js";

const COLORS = [
  { key: "yellow", var: "--chalk-yellow" },
  { key: "blue", var: "--chalk-blue" },
  { key: "coral", var: "--chalk-coral" },
  { key: "green", var: "--chalk-green" },
];

function BlockRow({ block, isGuest, toggleDone, deleteBlock, isToday, todayStr }) {
  const isDone = block.last_done_date === todayStr;
  const color = COLORS.find((c) => c.key === block.color)?.var || "--chalk-yellow";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(${color})`, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{block.subject}</div>
        <div className="empty" style={{ fontSize: 12 }}>
          {block.start_time} – {block.end_time}
        </div>
      </div>
      <button
        className="btn-ghost btn"
        style={{
          padding: 6,
          ...(isDone ? { borderColor: "var(--chalk-green)", color: "var(--chalk-green)" } : {}),
        }}
        onClick={() => toggleDone(block)}
        disabled={isGuest}
        title="Marcar como feito"
      >
        <Check size={14} />
      </button>
      <button className="btn-ghost btn" style={{ padding: 6 }} onClick={() => deleteBlock(block.id)} disabled={isGuest}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function StudySchedule() {
  const t = useT();
  const { isGuest } = useAuth();
  const { blocks, loading, addBlock, deleteBlock, toggleDone, todayStr } = useSchedule();

  const WEEKDAYS = [
    t("schedule_day_1"),
    t("schedule_day_2"),
    t("schedule_day_3"),
    t("schedule_day_4"),
    t("schedule_day_5"),
    t("schedule_day_6"),
    t("schedule_day_0"),
  ]; // exibidas de segunda a domingo, mas guardadas com a convenção 0=domingo

  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const todayIndex = new Date().getDay();

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState("yellow");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!subject.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addBlock({ dayOfWeek, subject: subject.trim(), startTime, endTime, color });
      setSubject("");
      setShowForm(false);
    } catch {
      setError(t("schedule_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("schedule_title")}</h1>
          <p>{t("schedule_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {isGuest && <div className="empty">{t("guest_no_changes")}</div>}

        <div>
          <button className="btn" onClick={() => setShowForm((v) => !v)} disabled={isGuest}>
            <Plus size={16} />
            {t("schedule_add_button")}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="input"
              placeholder={t("schedule_subject_placeholder")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select className="input" style={{ flex: 1, minWidth: 140 }} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                {DAY_ORDER.map((d, i) => (
                  <option key={d} value={d}>
                    {WEEKDAYS[i]}
                  </option>
                ))}
              </select>
              <input className="input" style={{ flex: 1, minWidth: 100 }} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <input className="input" style={{ flex: 1, minWidth: 100 }} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: `var(${c.var})`,
                    border: color === c.key ? "2px solid var(--chalk)" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            {error && <div className="empty">{error}</div>}
            <button className="btn" onClick={handleAdd} disabled={saving || !subject.trim()}>
              {t("schedule_save_button")}
            </button>
          </div>
        )}

        {loading && <div className="empty">...</div>}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DAY_ORDER.map((d, i) => {
              const dayBlocks = blocks.filter((b) => b.day_of_week === d);
              const isToday = d === todayIndex;
              return (
                <div key={d} className="card" style={isToday ? { borderColor: "var(--chalk-yellow)" } : undefined}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "var(--chalk-yellow)" : "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {WEEKDAYS[i]} {isToday && `· ${t("schedule_today")}`}
                  </div>
                  {dayBlocks.length === 0 ? (
                    <div className="empty" style={{ marginTop: 6 }}>
                      {t("schedule_day_empty")}
                    </div>
                  ) : (
                    <div>
                      {dayBlocks.map((b) => (
                        <BlockRow key={b.id} block={b} isGuest={isGuest} toggleDone={toggleDone} deleteBlock={deleteBlock} isToday={isToday} todayStr={todayStr} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
