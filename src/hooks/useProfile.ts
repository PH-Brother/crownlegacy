import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { gerarCodigo8 } from "@/lib/utils";

interface Profile {
  id: string;
  familia_id: string | null;
  nome_completo: string;
  avatar_url: string | null;
  role: string | null;
  pontos_total: number;
  nivel_gamificacao: number;
  telefone: string | null;
  data_nascimento: string | null;
  created_at: string | null;
}

interface Familia {
  id: string;
  nome: string;
  codigo_convite: string | null;
  plano: string | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [loading, setLoading] = useState(false);

  const buscarPerfil = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, familia_id, nome_completo, avatar_url, role, pontos_total, nivel_gamificacao, telefone, data_nascimento, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const p: Profile = {
        id: data.id,
        familia_id: data.familia_id,
        nome_completo: data.nome_completo,
        avatar_url: data.avatar_url,
        role: data.role,
        pontos_total: data.pontos_total ?? 0,
        nivel_gamificacao: data.nivel_gamificacao ?? 1,
        telefone: data.telefone,
        data_nascimento: data.data_nascimento,
        created_at: data.created_at,
      };
      setProfile(p);
      return p;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarPerfil = useCallback(async (dados: Partial<Pick<Profile, "nome_completo" | "telefone" | "avatar_url" | "data_nascimento">>) => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update(dados)
      .eq("id", profile.id);
    if (error) throw error;
    setProfile((prev) => prev ? { ...prev, ...dados } : null);
  }, [profile]);

  const buscarFamilia = useCallback(async (familiaId: string) => {
    const { data, error } = await supabase
      .from("familias")
      .select("id, nome, codigo_convite, plano")
      .eq("id", familiaId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const f: Familia = {
      id: data.id,
      nome: data.nome,
      codigo_convite: data.codigo_convite,
      plano: data.plano,
    };
    setFamilia(f);
    return f;
  }, []);

  const criarFamilia = useCallback(async (nome: string, userId: string) => {
    const { data, error } = await supabase.rpc("create_family_with_admin" as any, {
      p_nome: nome,
      p_user_id: userId,
    } as any);
    if (error) throw error;
    return data; // UUID of created family
  }, []);

  const entrarFamilia = useCallback(async (codigo: string, _userId: string) => {
    const { data, error } = await supabase.rpc("join_family_with_code", {
      p_codigo_convite: codigo,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Código de família não encontrado");
    return row;
  }, []);

  return { profile, familia, loading, buscarPerfil, atualizarPerfil, buscarFamilia, criarFamilia, entrarFamilia };
}
