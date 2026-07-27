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

export default function App() {
  const { user, logout } = useAuth();
  const t = useT();
  const [mode, setMode] = useState("chat");

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

  const NAV = [
    { id: "chat", label: t("nav_chat"), icon: MessageCircle, Comp: Chat },
    { id: "resumo", label: t("nav_resumo"), icon: FileText, Comp: Resumo },
    { id: "flashcards", label: t("nav_flashcards"), icon: Layers, Comp: Flashcards },
    { id: "quiz", label: t("nav_quiz"), icon: HelpCircle, Comp: Quiz },
    { id: "drills", label: t("nav_drills"), icon: Calculator, Comp: Drills },
    { id: "notacorte", label: t("nav_notacorte"), icon: Scale, Comp: NotaCorte },
    { id: "timer", label: t("nav_timer"), icon: TimerIcon, Comp: TimerTab },
    { id: "repertorio", label: t("nav_repertorio"), icon: BookOpen, Comp: Repertorio },
    { id: "friends", label: t("nav_friends"), icon: Users, Comp: Friends },
    { id: "feed", label: t("nav_feed"), icon: Activity, Comp: Feed },
    { id: "profile", label: t("nav_profile"), icon: User, Comp: Profile },
    { id: "settings", label: t("nav_settings"), icon: SettingsIcon, Comp: Settings },
  ];

  const Active = NAV.find((n) => n.id === mode)?.Comp ?? Chat;

  return (
    <div className="app-shell">
      <div className="sidebar">
        <GraduationCap size={26} color="#F2C94C" style={{ marginBottom: 10 }} />
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`navbtn ${mode === n.id ? "active" : ""}`}
            onClick={() => setMode(n.id)}
          >
            <n.icon size={18} />
            {n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="navbtn" onClick={logout} title={t("nav_logout")}>
          <LogOut size={18} />
          {t("nav_logout")}
        </button>
      </div>
      <div className="main">
        <UserBadge />
        <Active />
      </div>
    </div>
  );
}

function UserBadge() {
  const { prefs } = usePrefs();
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 26px 0" }}>
      <div className="user-chip">
        {prefs.photo_url && <img src={prefs.photo_url} alt="" />}
        <span>{prefs.display_name}</span>
      </div>
    </div>
  );
}
