import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { calculateTotalAssets, type Asset, type NetWorthSnapshot } from "@/hooks/useNetWorth";

interface ScoreResult {
  score: number;
  level: string;
  pilares: {
    liquidity: number;
    debt_ratio: number;
    saving: number;
    wealth_growth: number;
  };
}

type TransacaoBasic = { tipo: string; valor: number; data_transacao: string };

function calculatePilarLiquidity(assets: Asset[], despesaMedia: number): number {
  const liquidAssets = assets
    .filter((a) => a.liquidity === "high")
    .reduce((s, a) => s + Number(a.value), 0);
  const meses = despesaMedia > 0 ? liquidAssets / despesaMedia : liquidAssets > 0 ? 999 : 0;
  if (meses >= 6) return 250;
  if (meses >= 3) return 200;
  if (meses >= 1) return 150;
  return 50;
}

function calculatePilarDebtRatio(): number {
  // TODO: integrate with liabilities table when created
  // total_liabilities = 0 for now, so ratio = 0 → max score
  return 250;
}

function calculatePilarSaving(transacoes: TransacaoBasic[]): number {
  const receitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const despesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor), 0);
  const taxa = receitas > 0 ? (receitas - despesas) / receitas : 0;
  if (taxa >= 0.3) return 250;
  if (taxa >= 0.2) return 200;
  if (taxa >= 0.1) return 150;
  return 50;
}

function calculatePilarWealthGrowth(
  currentNetWorth: number,
  snapshots: NetWorthSnapshot[]
): number {
  const old = snapshots.length > 0 ? (snapshots[0].net_worth ?? snapshots[0].total_assets) : 0;
  if (old === 0 && currentNetWorth > 0) return 250;
  if (old === 0) return 50;
  const growth = (currentNetWorth - old) / Math.abs(old);
  if (growth >= 0.1) return 250;
  if (growth >= 0.05) return 200;
  if (growth >= 0) return 150;
  return 50;
}

function getLevel(score: number): string {
  if (score >= 900) return "excellent";
  if (score >= 750) return "good";
  if (score >= 500) return "regular";
  if (score >= 250) return "alert";
  return "critical";
}

export function useFinancialScore() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();

  const calculateScore = useCallback(
    async (
      assets: Asset[],
      transacoes: TransacaoBasic[],
      snapshots: NetWorthSnapshot[]
    ): Promise<ScoreResult> => {
      // Average monthly expenses from last 3 months
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      const recent = transacoes.filter(
        (t) => new Date(t.data_transacao) >= threeMonthsAgo
      );
      const despesas3m = recent
        .filter((t) => t.tipo === "despesa")
        .reduce((s, t) => s + Number(t.valor), 0);
      const despesaMedia = despesas3m / 3;

      const liquidity = calculatePilarLiquidity(assets, despesaMedia);
      const debt_ratio = calculatePilarDebtRatio();
      const saving = calculatePilarSaving(recent);
      const currentNetWorth = calculateTotalAssets(assets);
      const wealth_growth = calculatePilarWealthGrowth(currentNetWorth, snapshots);

      const score = liquidity + debt_ratio + saving + wealth_growth;
      const level = getLevel(score);

      // Persist score
      if (user?.id) {
        await supabase.from("financial_scores").upsert(
          {
            user_id: user.id,
            family_id: familiaId || null,
            score_total: score,
            level,
            pillar_liquidity: liquidity,
            pillar_debt_ratio: debt_ratio,
            pillar_saving: saving,
            pillar_wealth_growth: wealth_growth,
          },
          { onConflict: "user_id" }
        );
      }

      return { score, level, pilares: { liquidity, debt_ratio, saving, wealth_growth } };
    },
    [user?.id, familiaId]
  );

  return { calculateScore };
}

export function getScoreColor(level: string): string {
  switch (level) {
    case "excellent": return "hsl(43, 56%, 52%)";
    case "good": return "hsl(142, 71%, 45%)";
    case "regular": return "hsl(48, 82%, 55%)";
    case "alert": return "hsl(25, 95%, 55%)";
    case "critical": return "hsl(0, 84%, 60%)";
    default: return "hsl(43, 56%, 52%)";
  }
}

export function getScoreLabel(level: string): string {
  switch (level) {
    case "excellent": return "EXCELENTE";
    case "good": return "BOM";
    case "regular": return "REGULAR";
    case "alert": return "ALERTA";
    case "critical": return "CRÍTICO";
    default: return "—";
  }
}
