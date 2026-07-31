import React, { useState } from "react";
import { Check, Loader2, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useFriends } from "../lib/useFriends.js";

function Avatar({ photoUrl, name, size = 40 }) {
  return (
    <img
      src={photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "?")}`}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

export default function Friends() {
  const t = useT();
  const { isGuest } = useAuth();
  const { friends, received, sent, loading, searchByEmail, sendRequest, acceptRequest, removeFriendship } =
    useFriends();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState(new Set());

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchByEmail(query);
    setResults(data);
    setSearching(false);
  }

  async function handleSend(id) {
    setSentTo((cur) => new Set(cur).add(id));
    await sendRequest(id);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("friends_title")}</h1>
          <p>{t("friends_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {isGuest && <div className="empty">{t("guest_no_changes")}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder={t("friends_search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>

        {results.length > 0 && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar photoUrl={r.photo_url} name={r.display_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{r.display_name || r.email}</div>
                  <div className="empty" style={{ fontSize: 12 }}>
                    {r.email}
                  </div>
                </div>
                <button
                  className="btn-ghost btn"
                  onClick={() => handleSend(r.id)}
                  disabled={sentTo.has(r.id) || isGuest}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  <UserPlus size={14} />
                  {sentTo.has(r.id) ? t("friends_request_sent") : t("friends_add")}
                </button>
              </div>
            ))}
          </div>
        )}

        {received.length > 0 && (
          <div>
            <h2 className="hand" style={{ fontSize: 20, margin: "4px 0 8px" }}>
              {t("friends_received_title")}
            </h2>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {received.map((r) => (
                <div key={r.friendship_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar photoUrl={r.photo_url} name={r.display_name} />
                  <div style={{ flex: 1, fontSize: 14 }}>{r.display_name}</div>
                  <button
                    className="btn-ghost btn"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={() => acceptRequest(r.friendship_id, r.display_name)}
                    disabled={isGuest}
                  >
                    <Check size={14} />
                    {t("friends_accept")}
                  </button>
                  <button
                    className="btn-ghost btn"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                    onClick={() => removeFriendship(r.friendship_id)}
                    disabled={isGuest}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {sent.length > 0 && (
          <div>
            <h2 className="hand" style={{ fontSize: 20, margin: "4px 0 8px" }}>
              {t("friends_sent_title")}
            </h2>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sent.map((r) => (
                <div key={r.friendship_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar photoUrl={r.photo_url} name={r.display_name} />
                  <div style={{ flex: 1, fontSize: 14 }}>{r.display_name}</div>
                  <span className="empty" style={{ fontSize: 12 }}>
                    {t("friends_pending")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="hand" style={{ fontSize: 20, margin: "4px 0 8px" }}>
            {t("friends_list_title")}
          </h2>
          {loading && <div className="empty">...</div>}
          {!loading && friends.length === 0 && (
            <div className="empty" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} />
              {t("friends_empty")}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {friends.map((f) => {
              const accuracy =
                f.questions_answered > 0 ? Math.round((f.correct_answers / f.questions_answered) * 100) : null;
              return (
                <div key={f.friendship_id} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Avatar photoUrl={f.photo_url} name={f.display_name} size={44} />
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{f.display_name}</div>
                    <button className="btn-ghost btn" style={{ padding: 6 }} onClick={() => removeFriendship(f.friendship_id)} disabled={isGuest}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-card">
                      <div className="value">{f.flashcards_viewed}</div>
                      <div className="label">{t("stats_flashcards")}</div>
                    </div>
                    <div className="stat-card">
                      <div className="value">{f.correct_answers}</div>
                      <div className="label">{t("stats_correct")}</div>
                    </div>
                    <div className="stat-card">
                      <div className="value">{accuracy !== null ? `${accuracy}%` : "—"}</div>
                      <div className="label">{t("stats_accuracy")}</div>
                    </div>
                    <div className="stat-card">
                      <div className="value">{f.drills_correct}</div>
                      <div className="label">{t("stats_drills_correct")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
