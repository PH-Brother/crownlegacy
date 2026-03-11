import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";

export interface Asset {
  id: string;
  owner_id: string;
  family_id: string | null;
  name: string;
  type: string;
  category: string;
  value: number;
  currency: string;
  institution: string | null;
  notes: string | null;
  liquidity: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  family_id: string | null;
  total_assets: number;
  total_liabilities: number;
  net_worth: number | null;
  snapshot_data: Record<string, unknown> | null;
  snapshot_date: string;
  created_at: string;
}

export interface CashflowMonth {
  receitas: number;
  despesas: number;
  saldo: number;
}

export function calculateTotalAssets(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + Number(a.value), 0);
}

export function calculateCashflowMonth(
  transacoes: Array<{ tipo: string; valor: number; data_transacao: string }>,
  month?: Date
): CashflowMonth {
  const target = month || new Date();
  const y = target.getFullYear();
  const m = target.getMonth();

  const filtered = transacoes.filter((t) => {
    const d = new Date(t.data_transacao);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const receitas = filtered
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const despesas = filtered
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor), 0);

  return { receitas, despesas, saldo: receitas - despesas };
}

export function useNetWorth() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [transacoes, setTransacoes] = useState<Array<{ id: string; tipo: string; valor: number; data_transacao: string; categoria: string; descricao: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const since = ninetyDaysAgo.toISOString().split("T")[0];

      const [assetsRes, snapshotsRes, txRes] = await Promise.all([
        supabase
          .from("assets")
          .select("*")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("net_worth_snapshots")
          .select("*")
          .eq("user_id", user.id)
          .gte("snapshot_date", since)
          .order("snapshot_date", { ascending: true }),
        supabase
          .from("transacoes")
          .select("id, tipo, valor, data_transacao, categoria, descricao")
          .eq("usuario_id", user.id)
          .gte("data_transacao", since)
          .order("data_transacao", { ascending: false })
          .limit(500),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (snapshotsRes.error) throw snapshotsRes.error;
      if (txRes.error) throw txRes.error;

      setAssets((assetsRes.data as Asset[]) || []);
      setSnapshots((snapshotsRes.data as NetWorthSnapshot[]) || []);
      setTransacoes(txRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAll();
    }, 500);
  }, [fetchAll]);

  const createNetWorthSnapshot = useCallback(async () => {
    if (!user?.id) return;
    const totalAssets = calculateTotalAssets(assets);
    const today = new Date().toISOString().split("T")[0];

    await supabase.from("net_worth_snapshots").upsert(
      {
        user_id: user.id,
        family_id: familiaId || null,
        total_assets: totalAssets,
        total_liabilities: 0,
        snapshot_date: today,
        snapshot_data: {
          assets_breakdown: assets.map((a) => ({
            id: a.id,
            name: a.name,
            value: a.value,
            category: a.category,
          })),
        },
      },
      { onConflict: "user_id,snapshot_date" }
    );
  }, [user?.id, familiaId, assets]);

  const totalAssets = calculateTotalAssets(assets);
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const netWorth = latestSnapshot?.net_worth ?? totalAssets;

  return {
    assets,
    snapshots,
    transacoes,
    loading,
    error,
    totalAssets,
    netWorth,
    refetch,
    createNetWorthSnapshot,
  };
}
