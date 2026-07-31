import React, { useEffect, useState } from "react";
import { Check, Crown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useT } from "../contexts/PrefsContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getBillingStatus, openBillingPortal, startCheckout } from "../lib/billing.js";

const PERKS_KEYS = ["premium_perk_unlimited", "premium_perk_all_features", "premium_perk_priority"];

export default function Premium() {
  const t = useT();
  const { isGuest } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    getBillingStatus()
      .then(setStatus)
      .catch(() => setError(t("premium_status_error")))
      .finally(() => setLoading(false));
  }, [isGuest, t]);

  async function handleUpgrade() {
    setActionLoading(true);
    setError("");
    try {
      await startCheckout();
    } catch {
      setError(t("premium_checkout_error"));
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    setError("");
    try {
      await openBillingPortal();
    } catch {
      setError(t("premium_portal_error"));
      setActionLoading(false);
    }
  }

  const isPremium = status?.is_premium;
  const periodEndLabel = status?.current_period_end
    ? new Date(status.current_period_end).toLocaleDateString()
    : null;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="hand">{t("premium_title")}</h1>
          <p>{t("premium_subtitle")}</p>
        </div>
      </div>
      <div className="content">
        {isGuest && <div className="empty">{t("guest_no_changes")}</div>}

        {!isGuest && loading && <div className="empty">...</div>}

        {!isGuest && !loading && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Crown size={22} color="var(--chalk-yellow)" />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {isPremium ? t("premium_status_active") : t("premium_status_free")}
                </div>
                {isPremium && periodEndLabel && (
                  <div className="empty" style={{ fontSize: 12 }}>
                    {t("premium_renews_on", { date: periodEndLabel })}
                  </div>
                )}
                {!isPremium && (
                  <div className="empty" style={{ fontSize: 12 }}>
                    {t("premium_usage_today", { used: status?.usage_today ?? 0, limit: status?.daily_limit ?? 15 })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PERKS_KEYS.map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <Check size={15} color="var(--chalk-green)" style={{ flexShrink: 0 }} />
                  {t(k)}
                </div>
              ))}
            </div>

            {error && <div className="empty">{error}</div>}

            {isPremium ? (
              <button className="btn-ghost btn" onClick={handleManage} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
                {t("premium_manage_button")}
              </button>
            ) : (
              <button className="btn" onClick={handleUpgrade} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {t("premium_upgrade_button")}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
