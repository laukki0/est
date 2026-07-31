import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { buffer } from "node:stream/consumers";

// O Vercel por padrão já faz parse do body como JSON - mas a verificação
// de assinatura do Stripe precisa do corpo bruto (raw), por isso
// desligamos o bodyParser aqui e lemos o stream manualmente.
export const config = {
  api: { bodyParser: false },
};

function serviceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function upsertFromSubscription(db, stripe, customerId, subscription) {
  // Descobre de qual usuário é esse customer - guardamos isso na criação
  // do checkout (api/createCheckoutSession.js) e também nos metadados do
  // customer no Stripe, como reforço.
  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  let userId = existing?.user_id;
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    userId = customer?.metadata?.supabase_user_id;
  }
  if (!userId) {
    console.error("Webhook: não encontrei o usuário do customer", customerId);
    return;
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: "not_configured" });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  const rawBody = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Assinatura do webhook inválida:", err.message);
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  const db = serviceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertFromSubscription(db, stripe, session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object;
        await upsertFromSubscription(db, stripe, subscription.customer, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await db
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", subscription.customer);
        break;
      }
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro processando webhook do Stripe:", err.message);
    res.status(500).json({ error: "internal" });
  }
}
