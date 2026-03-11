import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const priceAnual = Deno.env.get("STRIPE_PRICE_ANUAL") || "";

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Missing env vars");
    return new Response(
      JSON.stringify({ error: "Configuração incompleta do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response(
      JSON.stringify({ error: "Signature ausente" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("Signature inválida:", e.message);
    return new Response(
      JSON.stringify({ error: "Signature inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Webhook event:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const familiaId = session.metadata?.familia_id || null;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          console.error("checkout.session.completed: missing userId or subscriptionId");
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id || "";
        const plano = priceId === priceAnual ? "premium_anual" : "premium";

        const { error } = await supabase.from("assinaturas").upsert(
          {
            user_id: userId,
            familia_id: familiaId || null,
            status: "active",
            plano,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        if (error) console.error("Upsert error:", error.message);
        else console.log("Assinatura criada:", userId, "-", plano);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "past_due",
          trialing: "trialing",
          incomplete: "inactive",
          incomplete_expired: "canceled",
          paused: "inactive",
        };

        const newStatus = statusMap[sub.status] || "inactive";

        const { error } = await supabase
          .from("assinaturas")
          .update({
            status: newStatus,
            cancelar_ao_fim: sub.cancel_at_period_end,
            periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("Update error:", error.message);
        else console.log("Assinatura atualizada:", subId, "-", newStatus);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;

        const { error } = await supabase
          .from("assinaturas")
          .update({
            status: "canceled",
            plano: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subId);

        if (error) console.error("Delete error:", error.message);
        else console.log("Assinatura cancelada:", subId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;

        if (subId) {
          const { error } = await supabase
            .from("assinaturas")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subId);

          if (error) console.error("Payment failed update error:", error.message);
          else console.log("Pagamento falhou:", invoice.id);
        }
        break;
      }

      default:
        console.log("Evento não tratado:", event.type);
    }
  } catch (e) {
    console.error("Erro processando webhook:", e.message, e.stack);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
