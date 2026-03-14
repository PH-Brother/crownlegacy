import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useToast } from "@/hooks/use-toast";

export interface FamilyMember {
  id: string;
  familia_id: string | null;
  nome_completo: string;
  avatar_url: string | null;
  role: string | null;
  netWorth: number;
  activeGoals: number;
}

export function useFamilyWealth() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [familyGoals, setFamilyGoals] = useState<Array<{
    id: string; title: string; type: string; target_value: number;
    current_value: number; target_date: string; priority: number; status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id || !familiaId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Fetch family members from profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, familia_id, nome_completo, avatar_url, role")
        .eq("familia_id", familiaId);
      if (pErr) throw pErr;

      // For each member, get latest net worth snapshot and active goals count
      const memberData: FamilyMember[] = await Promise.all(
        (profiles || []).map(async (p) => {
          try {
            const [assetsRes, goalsRes] = await Promise.all([
              supabase
                .from("assets")
                .select("value")
                .eq("owner_id", p.id)
                .eq("is_active", true),
              supabase
                .from("wealth_goals")
                .select("id", { count: "exact", head: true })
                .eq("user_id", p.id)
                .eq("status", "active"),
            ]);

            if (assetsRes.error) {
              console.error(`Erro ao buscar assets de ${p.id}:`, assetsRes.error);
              return {
                id: p.id, familia_id: p.familia_id, nome_completo: p.nome_completo,
                avatar_url: p.avatar_url, role: p.role, netWorth: 0, activeGoals: 0,
              };
            }

            // Calcula net worth em tempo real (soma dos assets ativos)
            const netWorth = (assetsRes.data || []).reduce(
              (sum, a) => sum + (Number(a.value) || 0), 0
            );

            return {
              id: p.id, familia_id: p.familia_id, nome_completo: p.nome_completo,
              avatar_url: p.avatar_url, role: p.role, netWorth,
              activeGoals: goalsRes.count ?? 0,
            };
          } catch (error) {
            console.error(`Erro ao processar membro ${p.id}:`, error);
            return {
              id: p.id, familia_id: p.familia_id, nome_completo: p.nome_completo,
              avatar_url: p.avatar_url, role: p.role, netWorth: 0, activeGoals: 0,
            };
          }
        })
      );

      setMembers(memberData);
      setTotalNetWorth(memberData.reduce((s, m) => s + Number(m.netWorth), 0));

      // Fetch family goals (top priority)
      const { data: goals } = await supabase
        .from("wealth_goals")
        .select("id, title, type, target_value, current_value, target_date, priority, status")
        .eq("family_id", familiaId)
        .eq("status", "active")
        .order("priority", { ascending: true })
        .limit(5);
      setFamilyGoals(goals || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados familiares");
    } finally {
      setLoading(false);
    }
  }, [user?.id, familiaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inviteMember = useCallback(async (email: string) => {
    if (!user?.id || !familiaId) return;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email === email) {
      toast({ title: "Você não pode convidar a si mesmo", variant: "destructive" });
      return;
    }
    // Check duplicate
    const { data: existing } = await supabase
      .from("family_invites")
      .select("id")
      .eq("familia_id", familiaId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      toast({ title: "Convite já enviado para este email", variant: "destructive" });
      return;
    }
    try {
      const { error: err } = await supabase.from("family_invites").insert({
        familia_id: familiaId,
        email,
        status: "pending",
      });
      if (err) throw err;
      toast({ title: `Convite enviado para ${email}` });
    } catch {
      toast({ title: "Erro ao enviar convite", variant: "destructive" });
    }
  }, [user?.id, familiaId, toast]);

  return { members, totalNetWorth, familyGoals, loading, error, inviteMember, refetch: fetchAll };
}
