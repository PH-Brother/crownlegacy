import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useToast } from "@/hooks/use-toast";

export interface WealthGoal {
  id: string;
  family_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  target_value: number;
  current_value: number;
  target_date: string;
  linked_asset_id: string | null;
  priority: number;
  status: string;
  motivational_verse: string | null;
  created_at: string;
}

export function useWealthGoals() {
  const { user } = useAuth();
  const { familiaId } = useFamiliaId();
  const { toast } = useToast();
  const [goals, setGoals] = useState<WealthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async (status?: string) => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("wealth_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true })
        .order("target_date", { ascending: true })
        .limit(100);

      if (status) query = query.eq("status", status);

      const { data, error: err } = await query;
      if (err) throw err;
      setGoals((data || []) as WealthGoal[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const createGoal = useCallback(async (goal: Omit<WealthGoal, "id" | "created_at" | "user_id">) => {
    if (!user?.id) return;
    if (!goal.title || goal.title.length < 5) {
      toast({ title: "Título deve ter pelo menos 5 caracteres", variant: "destructive" });
      return;
    }
    if (!goal.target_value || goal.target_value <= 0) {
      toast({ title: "Valor alvo deve ser maior que 0", variant: "destructive" });
      return;
    }
    if (!goal.target_date) {
      toast({ title: "Data alvo é obrigatória", variant: "destructive" });
      return;
    }

    try {
      const { error: err } = await supabase.from("wealth_goals").insert({
        user_id: user.id,
        family_id: familiaId || null,
        title: goal.title,
        description: goal.description || null,
        type: goal.type,
        target_value: goal.target_value,
        current_value: goal.current_value || 0,
        target_date: goal.target_date,
        linked_asset_id: goal.linked_asset_id || null,
        priority: goal.priority || 1,
        status: "active",
        motivational_verse: goal.motivational_verse || null,
      });
      if (err) throw err;
      toast({ title: "🎯 Meta criada com sucesso!" });
      fetchGoals();
    } catch {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    }
  }, [user?.id, familiaId, toast, fetchGoals]);

  const updateGoal = useCallback(async (id: string, updates: Partial<WealthGoal>) => {
    if (!user?.id) return;
    try {
      const { error: err } = await supabase
        .from("wealth_goals")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw err;
      toast({ title: "Meta atualizada!" });
      fetchGoals();
    } catch {
      toast({ title: "Erro ao atualizar meta", variant: "destructive" });
    }
  }, [user?.id, toast, fetchGoals]);

  const updateProgress = useCallback(async (id: string, currentValue: number) => {
    if (!user?.id) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    const newStatus = currentValue >= goal.target_value ? "completed" : goal.status;
    try {
      const { error: err } = await supabase
        .from("wealth_goals")
        .update({ current_value: currentValue, status: newStatus })
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw err;
      toast({ title: newStatus === "completed" ? "🎉 Meta concluída!" : "Progresso atualizado!" });
      fetchGoals();
    } catch {
      toast({ title: "Erro ao atualizar progresso", variant: "destructive" });
    }
  }, [user?.id, goals, toast, fetchGoals]);

  const completeGoal = useCallback(async (id: string) => {
    await updateGoal(id, { status: "completed" });
  }, [updateGoal]);

  const archiveGoal = useCallback(async (id: string) => {
    await updateGoal(id, { status: "archived" });
  }, [updateGoal]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user?.id) return;
    try {
      const { error: err } = await supabase
        .from("wealth_goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw err;
      toast({ title: "Meta deletada" });
      fetchGoals();
    } catch {
      toast({ title: "Erro ao deletar meta", variant: "destructive" });
    }
  }, [user?.id, toast, fetchGoals]);

  return { goals, loading, error, fetchGoals, createGoal, updateGoal, updateProgress, completeGoal, archiveGoal, deleteGoal, refetch: fetchGoals };
}
