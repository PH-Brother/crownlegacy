import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Transacao {
  id: string;
  familia_id: string | null;
  usuario_id: string | null;
  tipo: string;
  valor: number;
  categoria: string;
  descricao: string | null;
  data_transacao: string;
  created_at: string | null;
}

interface Totais {
  receitas: number;
  despesas: number;
  saldo: number;
}

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarTransacoes = useCallback(async (familiaId: string, mes: number, ano: number) => {
    setLoading(true);
    try {
      const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimMes = mes === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("transacoes")
        .select("*")
        .eq("familia_id", familiaId)
        .gte("data_transacao", inicioMes)
        .lt("data_transacao", fimMes)
        .order("data_transacao", { ascending: false });

      if (error) throw error;
      setTransacoes(data as Transacao[]);
      return data as Transacao[];
    } catch (err) {
      console.error("Erro ao buscar transações:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const criarTransacao = useCallback(async (dados: {
    familia_id: string;
    usuario_id: string;
    tipo: string;
    valor: number;
    categoria: string;
    descricao?: string;
    data_transacao: string;
  }) => {
    const { data, error } = await supabase
      .from("transacoes")
      .insert(dados)
      .select()
      .single();
    if (error) throw error;
    return data as Transacao;
  }, []);

  const excluirTransacao = useCallback(async (id: string) => {
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (error) throw error;
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const calcularTotais = useCallback((lista: Transacao[]): Totais => {
    const receitas = lista.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
    const despesas = lista.filter((t) => t.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, []);

  const useRealtimeListener = useCallback((familiaId: string | null) => {
    useEffect(() => {
      if (!familiaId) return;
      const channel = supabase
        .channel("transacoes-realtime")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "transacoes",
          filter: `familia_id=eq.${familiaId}`,
        }, () => {
          const now = new Date();
          buscarTransacoes(familiaId, now.getMonth() + 1, now.getFullYear());
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [familiaId]);
  }, [buscarTransacoes]);

  return { transacoes, loading, buscarTransacoes, criarTransacao, excluirTransacao, calcularTotais, useRealtimeListener };
}
