import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  // Usa o token do próprio usuário (não a service role) pra ler o
  // stripe_customer_id - a policy de select em `subscriptions` já
  // garante que só dá pra ler a própria linha.
  const supabaseAsUser = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) throw authError || new Error("no user");
  } catch {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "not_configured" });
    return;
  }

  try {
    const { data: sub } = await supabaseAsUser.from("subscriptions").select("stripe_customer_id").maybeSingle();
    if (!sub?.stripe_customer_id) {
      res.status(404).json({ error: "no_customer", message: "Nenhuma assinatura encontrada." });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: origin,
    });

    res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error("Erro ao criar portal session:", err.message);
    res.status(500).json({ error: "internal", message: "Não foi possível abrir o gerenciamento de assinatura agora." });
  }
}
