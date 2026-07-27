import React, { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useT } from "../contexts/PrefsContext.jsx";

export default function Login() {
  const { loginWithGoogle, authError } = useAuth();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      // erro já fica disponível em authError
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <GraduationCap size={54} color="#F2C94C" />
      <h1 className="hand">{t("login_title")}</h1>
      <p>{t("login_subtitle")}</p>
      <button className="btn" onClick={handleLogin} disabled={loading}>
        {loading ? <Loader2 size={16} className="spin" /> : null}
        {t("login_button")}
      </button>
      {authError && <div className="empty">{t("login_error")}</div>}
    </div>
  );
}
