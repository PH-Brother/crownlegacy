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
    _userId: string,
    pontos: number,
    tipo: string,
    descricao: string
  ) => {
    try {
      const { error } = await supabase.rpc("add_gamification_points", {
        p_pontos: pontos,
        p_tipo_evento: tipo,
        p_descricao: descricao,
      });
      if (error) { /* silently fail */ }
    } catch {
      /* silently fail */
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
      return [];
    }
    return data;
  }, []);

  return { adicionarPontos, buscarEventos, calcularNivel };
}
