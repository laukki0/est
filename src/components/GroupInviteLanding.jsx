import React, { useEffect, useState } from "react";
import { GraduationCap, LogIn, Users2 } from "lucide-react";
import { supabase } from "../supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useT } from "../contexts/PrefsContext.jsx";
import { useGroups } from "../lib/useGroups.js";
import Login from "./Login.jsx";

export default function GroupInviteLanding({ code }) {
  const t = useT();
  const { user, isGuest } = useAuth();
  const { joinByCode } = useGroups();

  const [preview, setPreview] = useState(undefined); // undefined = carregando, null = não encontrado
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase
      .rpc("get_group_preview_by_code", { code })
      .then(({ data, error: err }) => {
        if (!active) return;
        setPreview(err || !data || data.length === 0 ? null : data[0]);
      });
    return () => {
      active = false;
    };
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      await joinByCode(code);
      setJoined(true);
    } catch {
      setError(t("invite_join_error"));
    } finally {
      setJoining(false);
    }
  }

  function goToApp() {
    window.location.href = "/";
  }

  if (user === undefined || preview === undefined) {
    return (
      <div className="login-screen">
        <GraduationCap size={40} color="#F2C94C" />
      </div>
    );
  }

  if (preview === null) {
    return (
      <div className="login-screen">
        <GraduationCap size={40} color="#F2C94C" />
        <h1 className="hand">{t("invite_not_found_title")}</h1>
        <p>{t("invite_not_found_subtitle")}</p>
        <button className="btn" onClick={goToApp}>
          {t("invite_go_to_app")}
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        inviteInfo={
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Users2 size={20} color="var(--chalk-yellow)" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {t("invite_title", { name: preview.name })}
            </div>
            <div className="empty" style={{ fontSize: 13 }}>
              {t("invite_subtitle", { count: preview.member_count })}
            </div>
            <div style={{ fontSize: 13, marginTop: 8 }}>{t("invite_login_prompt")}</div>
          </>
        }
      />
    );
  }

  return (
    <div className="login-screen">
      <Users2 size={40} color="#F2C94C" />
      <h1 className="hand">{t("invite_title", { name: preview.name })}</h1>
      <p>{t("invite_subtitle", { count: preview.member_count })}</p>
      {preview.description && <p style={{ maxWidth: 380 }}>{preview.description}</p>}

      {isGuest && <div className="empty">{t("guest_no_changes")}</div>}

      {!isGuest && !joined && (
        <button className="btn" onClick={handleJoin} disabled={joining}>
          <LogIn size={16} />
          {t("invite_join_button")}
        </button>
      )}

      {joined && (
        <>
          <div style={{ color: "var(--chalk-green)", fontWeight: 700 }}>{t("invite_joined_message")}</div>
          <button className="btn" onClick={goToApp}>
            {t("invite_go_to_app")}
          </button>
        </>
      )}

      {error && <div className="empty">{error}</div>}
    </div>
  );
}
