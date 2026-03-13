import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Mensagem vazia");
    }
    const sanitizedMessage = message.trim().slice(0, 500);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: sanitizedMessage,
    });

    // Fetch context
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const [txnRes, insightRes, historyRes] = await Promise.all([
      supabase.from("transactions").select("merchant, amount, category, transaction_date").eq("user_id", user.id).gte("transaction_date", thirtyDaysAgo).order("transaction_date", { ascending: false }).limit(30),
      supabase.from("financial_insights").select("patterns, alerts, health_score, health_message").eq("user_id", user.id).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("chat_messages").select("role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const txns = txnRes.data || [];
    const insight = insightRes.data;
    const history = (historyRes.data || []).reverse();

    const txnSummary = txns.length > 0
      ? txns.map((t: { transaction_date: string; merchant: string; category: string; amount: number }) => `${t.transaction_date}: ${t.merchant} (${t.category}) R$ ${Math.abs(Number(t.amount)).toFixed(2)}`).join("\n")
      : "Nenhuma transação recente.";

    const patternSummary = insight?.patterns
      ? JSON.stringify(insight.patterns)
      : "Sem padrões calculados.";

    const chatHistory = history.map((m: { role: string; content: string }) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`).join("\n");

    const prompt = `Você é um assistente financeiro especializado do app Crown & Legacy. Responda a pergunta do usuário baseado em seus dados financeiros reais.

Transações recentes (últimos 30 dias):
${txnSummary}

Padrões de gasto:
${patternSummary}

Score de saúde financeira: ${insight?.health_score || "N/A"} (${insight?.health_message || "N/A"})

Histórico do chat:
${chatHistory}

Pergunta do usuário: ${sanitizedMessage}

Responda de forma:
- Concisa (máx 2 parágrafos)
- Personalizada (use dados reais, cite valores e categorias)
- Acionável (dê dicas práticas)
- Amigável (tom conversacional, use emojis se apropriado)
- Em português brasileiro

Retorne APENAS a resposta em texto puro.`;

    let aiResponse = "Desculpe, não consegui processar sua pergunta. Tente novamente.";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) aiResponse = text.trim();
      }
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        aiResponse = "⏳ Desculpe, estou demorando. Tente novamente em alguns instantes.";
      } else {
        throw e;
      }
    }

    // Save assistant response
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: aiResponse,
    });

    return new Response(JSON.stringify({ success: true, response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Copilot error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro ao processar" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
