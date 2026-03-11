import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useFinancialScore } from "@/hooks/useFinancialScore";
import { useBehaviorProfile, calculateBehaviorProfile } from "@/hooks/useBehaviorProfile";
import { generateInsights, type AIBehaviorInsight } from "@/services/insightGenerator";
import { useToast } from "@/hooks/use-toast";

export type { AIBehaviorInsight };

export function useAIInsights() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const { assets, transacoes, snapshots, netWorth } = useNetWorth();
  const { calculateScore } = useFinancialScore();
  const { profile, saveProfile } = useBehaviorProfile();
  const { toast } = useToast();

  const [insights, setInsights] = useState<AIBehaviorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInsights = useCallback(
    async (limit: number = 10) => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("ai_behavior_insights")
          .select("*")
          .eq("user_id", user.id)
          .order("generated_at", { ascending: false })
          .limit(limit);

        if (familiaId) {
          query = query.eq("family_id", familiaId);
        }

        const { data, error: err } = await query;
        if (err) throw err;
        setInsights((data as AIBehaviorInsight[]) || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar insights");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, familiaId]
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const generateNewInsights = useCallback(async () => {
    if (!user?.id || isGenerating) return;
    setIsGenerating(true);

    try {
      // Calculate and save behavior profile first
      const calculated = calculateBehaviorProfile(assets, transacoes, snapshots);
      await saveProfile(calculated);

      // Get score
      const scoreResult = await calculateScore(assets, transacoes, snapshots);

      // Build a temporary profile for insight generation
      const behaviorForInsight = {
        id: "",
        user_id: user.id,
        family_id: familiaId || null,
        risk_profile: calculated.risk_profile,
        spending_pattern: calculated.spending_pattern,
        saving_pattern: calculated.saving_pattern,
        discipline_score: calculated.discipline_score,
        wealth_growth_rate: calculated.wealth_growth_rate,
        last_analyzed_at: null,
        created_at: "",
        updated_at: "",
      };

      const newInsights = await generateInsights(
        behaviorForInsight,
        assets,
        transacoes,
        { score_total: scoreResult.score, level: scoreResult.level },
        netWorth
      );

      if (newInsights.length === 0) {
        toast({ title: "Nenhum insight gerado" });
        setIsGenerating(false);
        return;
      }

      // Dedup: check existing today
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("ai_behavior_insights")
        .select("type, severity")
        .eq("user_id", user.id)
        .gte("generated_at", today);

      const existingSet = new Set((existing || []).map((e) => `${e.type}:${e.severity}`));
      let inserted = 0;

      for (const insight of newInsights) {
        const key = `${insight.type}:${insight.severity}`;
        if (existingSet.has(key)) continue;

        const { error: insertErr } = await supabase.from("ai_behavior_insights").insert({
          user_id: user.id,
          family_id: familiaId || null,
          type: insight.type,
          severity: insight.severity,
          insight: insight.insight,
        });

        if (!insertErr) {
          inserted++;
          existingSet.add(key);
        }
      }

      toast({ title: `${inserted} insight${inserted !== 1 ? "s" : ""} gerado${inserted !== 1 ? "s" : ""} com sucesso` });
      await fetchInsights();
    } catch (err: unknown) {
      toast({ title: "Erro ao gerar insights", variant: "destructive" });
      console.error("generateNewInsights error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, isGenerating, assets, transacoes, snapshots, netWorth, familiaId, calculateScore, saveProfile, fetchInsights, toast]);

  const markAsRead = useCallback(
    async (insightId: string) => {
      if (!user?.id) return;
      await supabase
        .from("ai_behavior_insights")
        .update({ is_read: true })
        .eq("id", insightId)
        .eq("user_id", user.id);
      await fetchInsights();
    },
    [user?.id, fetchInsights]
  );

  const deleteInsight = useCallback(
    async (insightId: string) => {
      if (!user?.id) return;
      await supabase
        .from("ai_behavior_insights")
        .delete()
        .eq("id", insightId)
        .eq("user_id", user.id);
      await fetchInsights();
    },
    [user?.id, fetchInsights]
  );

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchInsights(), 500);
  }, [fetchInsights]);

  return { insights, loading, error, isGenerating, generateNewInsights, markAsRead, deleteInsight, refetch };
}
