import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  receitas: number;
  despesas: number;
  saldo: number;
  transacoes: any[];
  metas: any[];
  pontos: number;
  nivel: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(
  familiaId: string | null,
  userId: string | null,
  mes: number,
  ano: number
): DashboardData {
  const [receitas, setReceitas] = useState(0);
  const [despesas, setDespesas] = useState(0);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [pontos, setPontos] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!familiaId || !userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimMes = mes === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

      // Parallel fetches
      const [txRes, metasRes, profileRes] = await Promise.all([
        supabase
          .from("transacoes")
          .select("*")
          .eq("familia_id", familiaId)
          .gte("data_transacao", inicioMes)
          .lt("data_transacao", fimMes)
          .order("data_transacao", { ascending: false }),
        supabase
          .from("metas_financeiras")
          .select("*")
          .eq("familia_id", familiaId)
          .eq("status", "ativa")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("pontos_total, nivel_gamificacao")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (txRes.error) throw txRes.error;
      if (metasRes.error) throw metasRes.error;

      const txs = txRes.data || [];
      const totalReceitas = txs
        .filter((t) => t.tipo === "receita")
        .reduce((s, t) => s + Number(t.valor), 0);
      const totalDespesas = txs
        .filter((t) => t.tipo === "despesa")
        .reduce((s, t) => s + Number(t.valor), 0);

      setTransacoes(txs);
      setReceitas(totalReceitas);
      setDespesas(totalDespesas);
      setMetas(metasRes.data || []);
      setPontos(profileRes.data?.pontos_total ?? 0);
      setNivel(profileRes.data?.nivel_gamificacao ?? 1);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [familiaId, userId, mes, ano]);

  useEffect(() => {
    if (familiaId && userId) {
      fetchAll();
    }
  }, [fetchAll, familiaId, userId]);

  // Refresh on window focus
  useEffect(() => {
    const handler = () => {
      if (familiaId && userId) fetchAll();
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [fetchAll, familiaId, userId]);

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    transacoes,
    metas,
    pontos,
    nivel,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
