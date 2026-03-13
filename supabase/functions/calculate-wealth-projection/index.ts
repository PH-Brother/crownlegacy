import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateScenario(
  name: string,
  rate: number,
  pv: number,
  monthlyPmt: number,
  years: number
) {
  const r = rate / 100;
  const yearlyBreakdown: { year: number; value: number }[] = [];
  let currentValue = pv;

  yearlyBreakdown.push({ year: 0, value: Math.round(currentValue * 100) / 100 });

  for (let y = 1; y <= years; y++) {
    currentValue = currentValue * (1 + r) + monthlyPmt * 12;
    yearlyBreakdown.push({ year: y, value: Math.round(currentValue * 100) / 100 });
  }

  const finalValue = Math.round(currentValue * 100) / 100;
  const totalGain = Math.round((finalValue - pv) * 100) / 100;

  return { name, rate, finalValue, totalGain, yearlyBreakdown };
}

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

    const { netWorthInitial, monthlySavings, annualReturn, projectionYears } = await req.json();

    if (typeof netWorthInitial !== "number" || netWorthInitial <= 0) throw new Error("Net worth inicial deve ser > 0");
    if (typeof monthlySavings !== "number" || monthlySavings < 0) throw new Error("Economia mensal deve ser >= 0");
    if (typeof annualReturn !== "number" || annualReturn < 0 || annualReturn > 30) throw new Error("Retorno anual deve estar entre 0 e 30%");
    if (typeof projectionYears !== "number" || projectionYears < 1 || projectionYears > 50) throw new Error("Período deve ser entre 1 e 50 anos");

    const scenarios = [
      calculateScenario("Conservador", 5, netWorthInitial, monthlySavings, projectionYears),
      calculateScenario("Moderado", 8, netWorthInitial, monthlySavings, projectionYears),
      calculateScenario("Agressivo", 12, netWorthInitial, monthlySavings, projectionYears),
    ];

    const chartData = [];
    for (let y = 0; y <= projectionYears; y++) {
      chartData.push({
        year: y,
        conservative: scenarios[0].yearlyBreakdown[y].value,
        moderate: scenarios[1].yearlyBreakdown[y].value,
        aggressive: scenarios[2].yearlyBreakdown[y].value,
      });
    }

    // Save projection
    await supabase.from("wealth_projections").insert({
      user_id: user.id,
      net_worth_initial: netWorthInitial,
      monthly_savings: monthlySavings,
      annual_return: annualReturn,
      projection_years: projectionYears,
      scenarios,
    });

    return new Response(JSON.stringify({ success: true, scenarios, chartData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Projection error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro ao calcular" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
