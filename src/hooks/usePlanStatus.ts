import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface PlanStatus {
  plano: "trial" | "premium" | "cancelado";
  diasRestantes: number;
  isTrialAtivo: boolean;
  isPremium: boolean;
  isCancelado: boolean;
  loading: boolean;
}

export function usePlanStatus(): PlanStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<PlanStatus>({
    plano: "trial",
    diasRestantes: 14,
    isTrialAtivo: true,
    isPremium: false,
    isCancelado: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }

    const fetch = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("familia_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.familia_id) {
          setStatus((s) => ({ ...s, loading: false }));
          return;
        }

        const { data: familia } = await supabase
          .from("familias")
          .select("plano, data_fim_trial")
          .eq("id", profile.familia_id)
          .maybeSingle();

        if (!familia) {
          setStatus((s) => ({ ...s, loading: false }));
          return;
        }

        const planoRaw = familia.plano ?? "trial";
        const dataFimTrial = familia.data_fim_trial;
        const now = new Date();
        const trialEnd = dataFimTrial ? new Date(dataFimTrial) : null;
        const diasRestantes = trialEnd
          ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const isPremium = planoRaw === "premium";
        const isTrialAtivo = planoRaw === "trial" && trialEnd !== null && trialEnd > now;
        const isCancelado = planoRaw === "cancelado" || (planoRaw === "trial" && (trialEnd === null || trialEnd <= now));

        const plano: "trial" | "premium" | "cancelado" = isPremium
          ? "premium"
          : isTrialAtivo
            ? "trial"
            : "cancelado";

        setStatus({
          plano,
          diasRestantes,
          isTrialAtivo,
          isPremium,
          isCancelado,
          loading: false,
        });
      } catch {
        setStatus((s) => ({ ...s, loading: false }));
      }
    };

    fetch();
  }, [user]);

  return status;
}
