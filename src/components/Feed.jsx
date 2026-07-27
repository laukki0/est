import React from "react";
import { Calculator, HelpCircle, Timer as TimerIcon, UserPlus } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useActivities } from "../lib/useActivities.js";

const ICONS = {
  quiz_completed: HelpCircle,
  drill_completed: Calculator,
  study_session: TimerIcon,
  friend_added: UserPlus,
};

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t("feed_now");
  if (minutes < 60) return t("feed_minutes_ago", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("feed_hours_ago", { n: hours });
  const days = Math.floor(hours / 24);
  return t("feed_days_ago", { n: days });
}

function activityText(a, t, isMe) {
  const name = isMe ? t("feed_you") : a.display_name;
  switch (a.type) {
    case "quiz_completed":
      return t("feed_quiz", { name, score: a.payload.score, total: a.payload.total });
    case "drill_completed":
      return t("feed_drill", { name, score: a.payload.score, total: a.payload.total });
    case "study_session":
      return t("feed_session", { name, materia: a.payload.materia, minutes: a.payload.minutes });
    case "friend_added":
      return t("feed_friend", { name, friend: a.payload.name });
    default:
      return name;
  }
}

function Avatar({ photoUrl, name, size = 36 }) {
  return (
    <img
      src={photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "?")}`}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

export default function Feed() {
  const t = useT();
  const { user } = useAuth();
  const { activities, loading } = useActivities();

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("feed_title")}</h1>
          <p>{t("feed_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {loading && <div className="empty">...</div>}
        {!loading && activities.length === 0 && <div className="empty">{t("feed_empty")}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.map((a) => {
            const Icon = ICONS[a.type] || HelpCircle;
            const isMe = a.user_id === user?.id;
            return (
              <div
                key={a.id}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}
              >
                <Avatar photoUrl={a.photo_url} name={a.display_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{activityText(a, t, isMe)}</div>
                  <div className="empty" style={{ fontSize: 12, marginTop: 2 }}>
                    {timeAgo(a.created_at, t)}
                  </div>
                </div>
                <Icon size={18} color="var(--chalk-dim)" style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
