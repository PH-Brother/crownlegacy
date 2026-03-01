import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function calcularNivel(pontos: number): number {
  if (pontos >= 4000) return 5;
  if (pontos >= 2000) return 4;
  if (pontos >= 1000) return 3;
  if (pontos >= 500) return 2;
  return 1;
}

export function useGamificacao() {
  const adicionarPontos = useCallback(async (
    userId: string,
    pontos: number,
    tipo: string,
    descricao: string
  ) => {
    try {
      const { error: eventoError } = await supabase
        .from("gamificacao_eventos")
        .insert({
          usuario_id: userId,
          tipo_evento: tipo,
          pontos_ganhos: pontos,
          metadata: { descricao },
        });
      if (eventoError) console.error("Erro ao registrar evento:", eventoError);

      const { data: profile } = await supabase
        .from("profiles")
        .select("pontos_total")
        .eq("id", userId)
        .single();

      if (profile) {
        const novosPontos = Math.max(0, (profile.pontos_total ?? 0) + pontos);
        const novoNivel = calcularNivel(novosPontos);
        await supabase
          .from("profiles")
          .update({ pontos_total: novosPontos, nivel_gamificacao: novoNivel })
          .eq("id", userId);
      }
    } catch (err) {
      console.error("Erro na gamificação:", err);
    }
  }, []);

  const buscarEventos = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("gamificacao_eventos")
      .select("*")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Erro ao buscar eventos:", error);
      return [];
    }
    return data;
  }, []);

  return { adicionarPontos, buscarEventos, calcularNivel };
}
