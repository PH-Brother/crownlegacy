import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_APP_URL = "https://crownlegacy-app.lovable.app";

function normalizeAppUrl(rawUrl: string | undefined) {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return DEFAULT_APP_URL;

  const hasScheme =
    trimmed.startsWith("https://") || trimmed.startsWith("http://");
  const absolute = hasScheme ? trimmed : `https://${trimmed}`;

  return absolute.endsWith("/") ? absolute.slice(0, -1) : absolute;
}

function buildCheckoutRedirectUrl(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl}/`).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, userId, userEmail, familiaId } = await req.json();

    if (!priceId || typeof priceId !== "string") {
      return new Response(
        JSON.stringify({ error: "priceId inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "userId e userEmail são obrigatórios" }),
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

    const appUrl = normalizeAppUrl(
      Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL")
    );

    let successUrl: string;
    let cancelUrl: string;

    try {
      successUrl = buildCheckoutRedirectUrl(
        appUrl,
        "/planos?sucesso=true&session_id={CHECKOUT_SESSION_ID}"
      );
      cancelUrl = buildCheckoutRedirectUrl(appUrl, "/planos?cancelado=true");
    } catch {
      return new Response(
        JSON.stringify({ error: "APP_URL inválida. Use URL absoluta com https://" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        familia_id: familiaId || "",
      },
      subscription_data: {
        metadata: { user_id: userId },
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Checkout session criada:", session.id, "para user:", userId);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Erro ao criar checkout:", e.message, e.stack);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno ao criar checkout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
