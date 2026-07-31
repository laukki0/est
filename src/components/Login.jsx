import React, { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useT } from "../contexts/PrefsContext.jsx";

export default function Login({ inviteInfo }) {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword, loginAsGuest, authError } = useAuth();
  const t = useT();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(""); // chave de tradução pra mensagens de sucesso/aviso

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      // erro já fica disponível em authError
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGuest() {
    setGuestLoading(true);
    try {
      await loginAsGuest();
    } catch {
      // erro já fica disponível em authError
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await loginWithEmail(email, password);
      } else {
        const { needsEmailConfirmation } = await signUpWithEmail(email, password, name);
        if (needsEmailConfirmation) {
          setInfo("login_check_email");
        }
      }
    } catch {
      // erro já fica disponível em authError
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setInfo("login_need_email_for_reset");
      return;
    }
    setInfo("");
    setLoading(true);
    try {
      await resetPassword(email);
      setInfo("login_reset_sent");
    } catch {
      // erro já fica disponível em authError
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setInfo("");
  }

  return (
    <div className="login-screen">
      <GraduationCap size={54} color="#F2C94C" />
      <h1 className="hand">{t("login_title")}</h1>
      <p>{t("login_subtitle")}</p>

      {inviteInfo && (
        <div
          className="card"
          style={{ maxWidth: 320, textAlign: "center", borderColor: "var(--chalk-yellow)" }}
        >
          {inviteInfo}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}
      >
        {mode === "signup" && (
          <input
            className="input"
            type="text"
            placeholder={t("login_name_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className="input"
          type="email"
          placeholder={t("login_email_placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="input"
          type="password"
          placeholder={t("login_password_placeholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={6}
        />

        <button className="btn" type="submit" disabled={loading || !email.trim() || !password}>
          {loading ? <Loader2 size={16} className="spin" /> : null}
          {mode === "signin" ? t("login_signin_button") : t("login_signup_button")}
        </button>

        {mode === "signin" && (
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, alignSelf: "center" }}
            onClick={handleForgotPassword}
            disabled={loading}
          >
            {t("login_forgot_password")}
          </button>
        )}

        <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={toggleMode}>
          {mode === "signin" ? t("login_toggle_to_signup") : t("login_toggle_to_signin")}
        </button>
      </form>

      {info && (
        <div className="empty" style={{ maxWidth: 320, textAlign: "center" }}>
          {t(info)}
        </div>
      )}
      {authError && (
        <div className="empty" style={{ maxWidth: 320, textAlign: "center" }}>
          {t(authError)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 320 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ fontSize: 12 }}>{t("login_or")}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
      </div>

      <button className="btn" onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading ? <Loader2 size={16} className="spin" /> : null}
        {t("login_button")}
      </button>

      <button className="btn-ghost btn" onClick={handleGuest} disabled={guestLoading}>
        {guestLoading ? <Loader2 size={16} className="spin" /> : null}
        {t("login_guest_button")}
      </button>
    </div>
  );
}
