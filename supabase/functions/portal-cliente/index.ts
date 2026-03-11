import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();

    if (!customerId || typeof customerId !== "string") {
      return new Response(
        JSON.stringify({ error: "customerId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://crownlegacy-app.lovable.app";
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/planos`,
    });

    console.log("Portal session criada para customer:", customerId);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Erro ao criar portal:", e.message, e.stack);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno ao criar portal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
