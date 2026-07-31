import React, { useState } from "react";
import {
  Activity,
  BookOpen,
  Calculator,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  LogOut,
  MessageCircle,
  Scale,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  User,
  Users,
  Users2,
  Eye,
  Shield,
  CalendarDays,
  Brain,
  Crown,
  Percent,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext.jsx";
import { useT, usePrefs } from "./contexts/PrefsContext.jsx";
import Login from "./components/Login.jsx";
import Chat from "./components/Chat.jsx";
import Resumo from "./components/Resumo.jsx";
import Flashcards from "./components/Flashcards.jsx";
import Quiz from "./components/Quiz.jsx";
import Repertorio from "./components/Repertorio.jsx";
import TimerTab from "./components/Timer.jsx";
import Profile from "./components/Profile.jsx";
import Settings from "./components/Settings.jsx";
import Drills from "./components/Drills.jsx";
import NotaCorte from "./components/NotaCorte.jsx";
import Friends from "./components/Friends.jsx";
import Feed from "./components/Feed.jsx";
import StudyGroups from "./components/StudyGroups.jsx";
import Exams from "./components/Exams.jsx";
import StudySchedule from "./components/StudySchedule.jsx";
import Feynman from "./components/Feynman.jsx";
import Premium from "./components/Premium.jsx";
import GradesCalc from "./components/GradesCalc.jsx";
import GroupInviteLanding from "./components/GroupInviteLanding.jsx";

export default function App() {
  const { user, isGuest, logout } = useAuth();
  const t = useT();
  const [mode, setMode] = useState("chat");

  const inviteMatch = window.location.pathname.match(/^\/convite\/([A-Za-z0-9]+)/);
  if (inviteMatch) {
    return <GroupInviteLanding code={inviteMatch[1]} />;
  }

  if (user === undefined) {
    return (
      <div className="login-screen">
        <GraduationCap size={40} color="#F2C94C" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const NAV_GROUPS = [
    {
      key: "study",
      label: t("nav_group_study"),
      items: [
        { id: "chat", label: t("nav_chat"), icon: MessageCircle, Comp: Chat },
        { id: "schedule", label: t("nav_schedule"), icon: CalendarDays, Comp: StudySchedule },
        { id: "resumo", label: t("nav_resumo"), icon: FileText, Comp: Resumo },
        { id: "flashcards", label: t("nav_flashcards"), icon: Layers, Comp: Flashcards },
        { id: "quiz", label: t("nav_quiz"), icon: HelpCircle, Comp: Quiz },
        { id: "feynman", label: t("nav_feynman"), icon: Brain, Comp: Feynman },
        { id: "drills", label: t("nav_drills"), icon: Calculator, Comp: Drills },
        { id: "notacorte", label: t("nav_notacorte"), icon: Scale, Comp: NotaCorte },
        { id: "grades", label: t("nav_grades"), icon: Percent, Comp: GradesCalc },
        { id: "timer", label: t("nav_timer"), icon: TimerIcon, Comp: TimerTab },
        { id: "repertorio", label: t("nav_repertorio"), icon: BookOpen, Comp: Repertorio },
        { id: "exams", label: t("nav_exams"), icon: Shield, Comp: Exams },
      ],
    },
    {
      key: "social",
      label: t("nav_group_social"),
      items: [
        { id: "friends", label: t("nav_friends"), icon: Users, Comp: Friends },
        { id: "groups", label: t("nav_groups"), icon: Users2, Comp: StudyGroups },
        { id: "feed", label: t("nav_feed"), icon: Activity, Comp: Feed },
      ],
    },
    {
      key: "account",
      label: t("nav_group_account"),
      items: [
        { id: "profile", label: t("nav_profile"), icon: User, Comp: Profile },
        { id: "premium", label: t("nav_premium"), icon: Crown, Comp: Premium },
        { id: "settings", label: t("nav_settings"), icon: SettingsIcon, Comp: Settings },
      ],
    },
  ];

  const NAV = NAV_GROUPS.flatMap((g) => g.items);
  const Active = NAV.find((n) => n.id === mode)?.Comp ?? Chat;

  return (
    <div className="app-shell">
      <div className="sidebar">
        <GraduationCap className="sidebar-logo" size={26} color="#F2C94C" style={{ marginBottom: 10 }} />
        {NAV_GROUPS.map((g) => (
          <React.Fragment key={g.key}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.map((n) => (
              <button
                key={n.id}
                className={`navbtn ${mode === n.id ? "active" : ""}`}
                onClick={() => setMode(n.id)}
              >
                <n.icon size={18} />
                {n.label}
              </button>
            ))}
          </React.Fragment>
        ))}
        <div style={{ flex: 1 }} />
        <button className="navbtn" onClick={logout} title={t("nav_logout")}>
          <LogOut size={18} />
          {t("nav_logout")}
        </button>
      </div>
      <div className="main">
        <div style={{ position: "relative", zIndex: 1 }}>
          <UserBadge isGuest={isGuest} />
          {isGuest && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: "0 26px",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                background: "rgba(242, 201, 76, 0.12)",
                border: "1px solid rgba(242, 201, 76, 0.35)",
              }}
            >
              <Eye size={15} color="#F2C94C" />
              {t("guest_banner")}
            </div>
          )}
        </div>
        <Active />
      </div>
    </div>
  );
}

function UserBadge({ isGuest }) {
  const { prefs } = usePrefs();
  const t = useT();
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 26px 0" }}>
      <div className="user-chip">
        {prefs.photo_url && <img src={prefs.photo_url} alt="" />}
        <span>{isGuest ? t("login_guest_button") : prefs.display_name}</span>
      </div>
    </div>
  );
}
