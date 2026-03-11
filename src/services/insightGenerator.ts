import { supabase } from "@/integrations/supabase/client";
import { type Asset, calculateTotalAssets } from "@/hooks/useNetWorth";
import type { BehaviorProfile } from "@/hooks/useBehaviorProfile";

export interface AIBehaviorInsight {
  id?: string;
  user_id?: string;
  family_id?: string | null;
  type: "spending_pattern" | "wealth_growth" | "risk_warning" | "discipline" | "biblical_guidance";
  insight: string;
  severity: "info" | "warning" | "critical" | "positive";
  is_read?: boolean;
  generated_at?: string;
}

const VALID_TYPES = ["spending_pattern", "wealth_growth", "risk_warning", "discipline", "biblical_guidance"];
const VALID_SEVERITIES = ["info", "warning", "critical", "positive"];

export async function generateInsights(
  profile: BehaviorProfile,
  assets: Asset[],
  transacoes: Array<{ tipo: string; valor: number; data_transacao: string }>,
  score: { score_total: number; level: string },
  netWorth: number
): Promise<AIBehaviorInsight[]> {
  const contexto = {
    risk_profile: profile.risk_profile,
    spending_pattern: profile.spending_pattern,
    saving_pattern: profile.saving_pattern,
    discipline_score: profile.discipline_score,
    wealth_growth_rate: profile.wealth_growth_rate,
    net_worth: netWorth,
    financial_score: score.score_total,
    total_assets: calculateTotalAssets(assets),
    total_transactions: transacoes.length,
  };

  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: { tipo: "behavioral_insights", contexto },
  });

  if (error) throw error;

  const raw = data?.resultado;
  if (!Array.isArray(raw)) return [];

  // Validate each insight
  return raw.filter((item: Record<string, unknown>) => {
    if (!item || typeof item !== "object") return false;
    if (!VALID_TYPES.includes(item.type as string)) return false;
    if (!VALID_SEVERITIES.includes(item.severity as string)) return false;
    if (typeof item.insight !== "string" || item.insight.length < 10) return false;
    return true;
  }) as AIBehaviorInsight[];
}
