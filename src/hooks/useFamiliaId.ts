import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseFamiliaIdResult {
  familiaId: string | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useFamiliaId(): UseFamiliaIdResult {
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          setIsLoading(false);
          return;
        }

        if (!cancelled) setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("familia_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!cancelled) {
          setFamiliaId(profile?.familia_id ?? null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Erro ao carregar família");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { familiaId, userId, isLoading, error };
}
