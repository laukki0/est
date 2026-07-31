import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Verifica o token de sessão do Supabase - mesma lógica do chatWithAI.js.
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

// Client com a service role key - só usado aqui pra checar/gravar
// stripe_customer_id, já que essa coluna não tem policy de escrita pro
// usuário comum (só o webhook, que também usa a service role, deveria
// escrever nela normalmente - mas guardar o id do cliente Stripe assim
// que ele é criado evita duplicar clientes se o usuário abrir o checkout
// mais de uma vez antes do webhook confirmar o pagamento).
function serviceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

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

  let user;
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) throw error || new Error("no user");
    user = data.user;
  } catch {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    res.status(500).json({ error: "not_configured", message: "Pagamentos ainda não configurados neste servidor." });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = serviceClient();

  try {
    // Reaproveita o customer do Stripe se o usuário já tiver um (ex.:
    // tentou assinar antes e cancelou o checkout no meio do caminho).
    const { data: existing } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await db.from("subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId, status: "inactive" },
        { onConflict: "user_id" }
      );
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // Cartão é o meio mais simples e confiável pra cobrança recorrente.
      // O Stripe também suporta PIX recorrente ("Pix Automático"), mas
      // isso exige configurar mandate_options separadamente - não é só
      // adicionar "pix" na lista de payment_method_types como no PIX de
      // pagamento único. Se quiser oferecer isso depois, veja:
      // https://docs.stripe.com/payments/pix/accept-a-recurring-payment
      payment_method_types: ["card"],
      success_url: `${origin}/?premium=success`,
      cancel_url: `${origin}/?premium=cancelled`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erro ao criar checkout session:", err.message);
    res.status(500).json({ error: "internal", message: "Não foi possível iniciar o pagamento agora." });
  }
}
