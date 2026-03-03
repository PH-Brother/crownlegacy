import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Totais {
  receitas: number;
  despesas: number;
  saldo: number;
}

interface MetaFinanceira {
  id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  prazo_final: string | null;
  status: string | null;
  categoria: string | null;
}

interface FamiliaCompleta {
  id: string;
  nome: string;
  codigo_convite: string | null;
  plano: string | null;
  data_fim_trial: string | null;
}

interface DashboardMetrics {
  totais: Totais;
  transacoes: any[];
  metas: MetaFinanceira[];
  familia: FamiliaCompleta | null;
  loading: boolean;
}

export function useDashboardMetrics(userId: string | undefined, mes: number, ano: number): DashboardMetrics {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [metas, setMetas] = useState<MetaFinanceira[]>([]);
  const [familia, setFamilia] = useState<FamiliaCompleta | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Get familia_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id")
        .eq("id", userId)
        .maybeSingle();

      const familiaId = profile?.familia_id;
      if (!familiaId) {
        setLoading(false);
        return;
      }

      // 2. Fetch familia with data_fim_trial
      const { data: fam } = await supabase
        .from("familias")
        .select("id, nome, codigo_convite, plano, data_fim_trial")
        .eq("id", familiaId)
        .maybeSingle();

      if (fam) {
        setFamilia(fam as FamiliaCompleta);
      }

      // 3. Fetch transacoes for month
      const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimMes = mes === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

      const { data: txs } = await supabase
        .from("transacoes")
        .select("*")
        .eq("familia_id", familiaId)
        .gte("data_transacao", inicioMes)
        .lt("data_transacao", fimMes)
        .order("data_transacao", { ascending: false });

      setTransacoes(txs || []);

      // 4. Fetch active metas
      const { data: metasData } = await supabase
        .from("metas_financeiras")
        .select("id, titulo, valor_alvo, valor_atual, prazo_final, status, categoria")
        .eq("familia_id", familiaId)
        .eq("status", "ativa")
        .order("created_at", { ascending: false });

      setMetas((metasData || []) as MetaFinanceira[]);
    } catch (err) {
      // error silenced for production
    } finally {
      setLoading(false);
    }
  }, [userId, mes, ano]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for window focus to refresh
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [fetchAll]);

  const totais: Totais = {
    receitas: transacoes.filter(t => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0),
    despesas: transacoes.filter(t => t.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0),
    get saldo() { return this.receitas - this.despesas; },
  };

  return { totais, transacoes, metas, familia, loading };
}
