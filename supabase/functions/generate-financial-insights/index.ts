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

    const { forceRefresh } = await req.json().catch(() => ({ forceRefresh: false }));

    // Check cache
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("financial_insights")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({ success: true, data: cached, cached: true, expiresAt: cached.expires_at }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch transactions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", thirtyDaysAgo)
      .order("transaction_date", { ascending: false });

    const txns = transactions || [];

    if (txns.length === 0) {
      const emptyInsight = {
        patterns: [], alerts: [], recommendations: [],
        health_score: 0, health_message: "Sem transações para análise",
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      return new Response(JSON.stringify({ success: true, data: emptyInsight, cached: false, expiresAt: emptyInsight.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate patterns
    const categoryTotals: Record<string, number> = {};
    for (const t of txns) {
      const cat = t.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(Number(t.amount));
    }
    const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const patterns = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, total]) => ({
        category,
        total: Math.round(total * 100) / 100,
        percentage: Math.round((total / totalSpent) * 100),
        trend: "stable",
        insight: `Gasto de R$ ${total.toFixed(2)} em ${category}`,
      }));

    // Calculate alerts (> R$ 500)
    const alerts = txns
      .filter((t: { amount: number }) => Math.abs(Number(t.amount)) > 500)
      .sort((a: { amount: number }, b: { amount: number }) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
      .slice(0, 5)
      .map((t: { category: string; amount: number; merchant: string }) => ({
        type: "high_spend",
        category: t.category || "Other",
        amount: Math.abs(Number(t.amount)),
        message: `Gasto alto de R$ ${Math.abs(Number(t.amount)).toFixed(2)} em ${t.merchant || t.category}`,
      }));

    // Calculate health score
    const maxCatPct = patterns.length > 0 ? patterns[0].percentage : 0;
    const diversScore = maxCatPct <= 40 ? 50 : maxCatPct <= 60 ? 30 : 10;
    const avgSpend = totalSpent / Math.max(txns.length, 1);
    const variance = txns.reduce((s: number, t: { amount: number }) => s + Math.pow(Math.abs(Number(t.amount)) - avgSpend, 2), 0) / Math.max(txns.length, 1);
    const stdDev = Math.sqrt(variance);
    const consistScore = stdDev < avgSpend * 0.5 ? 30 : stdDev < avgSpend ? 20 : 10;
    const savingScore = 20; // Default without income data
    const healthScore = Math.min(100, diversScore + consistScore + savingScore);
    const healthMessage = healthScore >= 76 ? "Excelente" : healthScore >= 51 ? "Bom" : healthScore >= 26 ? "Precisa melhorar" : "Crítico";

    // Generate recommendations via Gemini
    let recommendations: { text: string; potential_savings: number; category: string }[] = [];
    try {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (GEMINI_API_KEY) {
        const prompt = `Baseado nestes padrões de gasto de um usuário brasileiro: ${JSON.stringify(patterns)}.
Gere 3-5 recomendações personalizadas de economia. Retorne APENAS um array JSON válido no formato:
[{"text": "recomendação", "potential_savings": 100, "category": "Food"}]
Sem markdown, sem explicações extras.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonStart = rawText.indexOf("[");
          const jsonEnd = rawText.lastIndexOf("]");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            recommendations = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
          }
        }
      }
    } catch (e) {
      console.error("Gemini recommendations error:", e);
    }

    if (recommendations.length === 0) {
      recommendations = patterns.slice(0, 3).map((p) => ({
        text: `Reduza gastos em ${p.category} em 10% para economizar R$ ${(p.total * 0.1).toFixed(2)}/mês`,
        potential_savings: Math.round(p.total * 0.1),
        category: p.category,
      }));
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Upsert insight
    const insightData = {
      user_id: user.id,
      patterns,
      alerts,
      recommendations,
      health_score: healthScore,
      health_message: healthMessage,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    const { data: saved, error: saveErr } = await supabase
      .from("financial_insights")
      .insert(insightData)
      .select()
      .single();

    if (saveErr) console.error("Save error:", saveErr);

    return new Response(JSON.stringify({ success: true, data: saved || insightData, cached: false, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro ao gerar insights" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
