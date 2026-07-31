import { supabase } from "../supabase.js";

async function authedFetch(path) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Faça login primeiro.");

  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Não foi possível completar a ação.");
  return data;
}

export async function getBillingStatus() {
  const { data, error } = await supabase.rpc("get_billing_status");
  if (error) throw error;
  return data?.[0] || { is_premium: false, plan: null, current_period_end: null, usage_today: 0, daily_limit: 15 };
}

export async function startCheckout() {
  const { url } = await authedFetch("/api/createCheckoutSession");
  window.location.href = url;
}

export async function openBillingPortal() {
  const { url } = await authedFetch("/api/createPortalSession");
  window.location.href = url;
}
