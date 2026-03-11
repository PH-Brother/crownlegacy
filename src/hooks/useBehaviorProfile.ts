import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { type Asset, calculateTotalAssets } from "@/hooks/useNetWorth";

export interface BehaviorProfile {
  id: string;
  user_id: string;
  family_id: string | null;
  risk_profile: "conservative" | "moderate" | "aggressive";
  spending_pattern: "frugal" | "balanced" | "spender" | null;
  saving_pattern: "consistent" | "irregular" | "minimal" | null;
  discipline_score: number;
  wealth_growth_rate: number;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

type TransacaoBasic = { tipo: string; valor: number; data_transacao: string };

const LOW_RISK_TYPES = ["real_estate", "cash", "conta_bancaria"];

export function calculateBehaviorProfile(
  assets: Asset[],
  transacoes: TransacaoBasic[],
  snapshots?: Array<{ total_assets: number; net_worth: number | null; snapshot_date: string }>,
  hasActiveGoals?: boolean
): {
  risk_profile: "conservative" | "moderate" | "aggressive";
  spending_pattern: "frugal" | "balanced" | "spender" | null;
  saving_pattern: "consistent" | "irregular" | "minimal" | null;
  discipline_score: number;
  wealth_growth_rate: number;
} {
  // Risk profile
  let risk_profile: "conservative" | "moderate" | "aggressive" = "moderate";
  if (assets.length > 0) {
    const total = calculateTotalAssets(assets);
    if (total > 0) {
      const lowRisk = assets
        .filter((a) => LOW_RISK_TYPES.includes(a.type) || LOW_RISK_TYPES.includes(a.category.toLowerCase()))
        .reduce((s, a) => s + Number(a.value), 0);
      const pct = lowRisk / total;
      risk_profile = pct >= 0.7 ? "conservative" : pct >= 0.4 ? "moderate" : "aggressive";
    }
  }

  // 90-day transactions
  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);
  const recent = transacoes.filter((t) => new Date(t.data_transacao) >= ninetyDaysAgo);

  const receitas90 = recent.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
  const despesas90 = recent.filter((t) => t.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0);

  // Spending pattern
  let spending_pattern: "frugal" | "balanced" | "spender" | null = null;
  if (receitas90 > 0) {
    const taxa = despesas90 / receitas90;
    spending_pattern = taxa < 0.5 ? "frugal" : taxa <= 0.8 ? "balanced" : "spender";
  }

  // Saving pattern
  let saving_pattern: "consistent" | "irregular" | "minimal" | null = null;
  if (receitas90 > 0) {
    const taxaPoupanca = (receitas90 - despesas90) / receitas90;
    saving_pattern = taxaPoupanca >= 0.2 ? "consistent" : taxaPoupanca >= 0.05 ? "irregular" : "minimal";
  }

  // Discipline score (0-100)
  let discipline_score = 0;
  if (saving_pattern === "consistent") discipline_score = 70;
  else if (saving_pattern === "irregular") discipline_score = 40;
  else if (saving_pattern === "minimal") discipline_score = 10;
  if (hasActiveGoals) discipline_score = Math.min(100, discipline_score + 20);

  // Wealth growth rate
  let wealth_growth_rate = 0;
  const currentNW = calculateTotalAssets(assets);
  if (snapshots && snapshots.length > 0) {
    const oldSnap = snapshots[0];
    const oldNW = oldSnap.net_worth ?? oldSnap.total_assets;
    if (oldNW > 0) {
      wealth_growth_rate = Math.max(-1, Math.min(1, (currentNW - oldNW) / oldNW));
    }
    if (currentNW > oldNW) discipline_score = Math.min(100, discipline_score + 10);
  }

  return { risk_profile, spending_pattern, saving_pattern, discipline_score, wealth_growth_rate };
}

export function useBehaviorProfile() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("behavior_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (err) throw err;
      setProfile(data as BehaviorProfile | null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil comportamental");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (calculated: ReturnType<typeof calculateBehaviorProfile>) => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const { error: err } = await supabase.from("behavior_profiles").upsert(
        {
          user_id: user.id,
          family_id: familiaId || null,
          risk_profile: calculated.risk_profile,
          spending_pattern: calculated.spending_pattern,
          saving_pattern: calculated.saving_pattern,
          discipline_score: calculated.discipline_score,
          wealth_growth_rate: calculated.wealth_growth_rate,
          last_analyzed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );
      if (err) throw err;
      await fetchProfile();
    },
    [user?.id, familiaId, fetchProfile]
  );

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProfile(), 500);
  }, [fetchProfile]);

  return { profile, loading, error, saveProfile, calculateBehaviorProfile, refetch };
}
