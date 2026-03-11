import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useToast } from "./use-toast";

interface Assinatura {
  id: string;
  user_id: string;
  familia_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plano: string;
  status: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  cancelar_ao_fim: boolean | null;
}

export function useAssinatura() {
  const { user } = useAuth();
  const { familia } = useProfile();
  const { toast } = useToast();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchAssinatura = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAssinatura(data);
        setError(null);
      }
    } catch (e) {
      setError("Erro ao buscar assinatura");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssinatura();
  }, [fetchAssinatura]);

  const isPremium =
    assinatura?.status === "active" &&
    (assinatura?.plano === "premium" || assinatura?.plano === "premium_anual");

  const iniciarCheckout = useCallback(
    async (priceId: string) => {
      if (!priceId || !user) return;

      setCheckoutLoading(true);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "criar-checkout",
          {
            body: {
              priceId,
              userId: user.id,
              userEmail: user.email || "",
              familiaId: familia?.id || "",
            },
          }
        );

        if (invokeError) throw new Error(invokeError.message);
        if (data?.error) throw new Error(data.error);
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao iniciar checkout";
        toast({ title: msg, variant: "destructive" });
      } finally {
        setCheckoutLoading(false);
      }
    },
    [user, familia, toast]
  );

  const abrirPortalCliente = useCallback(async () => {
    if (!assinatura?.stripe_customer_id) {
      toast({ title: "Assinatura não encontrada", variant: "destructive" });
      return;
    }

    setPortalLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "portal-cliente",
        { body: { customerId: assinatura.stripe_customer_id } }
      );

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao abrir portal";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }, [assinatura, toast]);

  return {
    assinatura,
    loading,
    error,
    isPremium,
    checkoutLoading,
    portalLoading,
    iniciarCheckout,
    abrirPortalCliente,
    refetch: fetchAssinatura,
  };
}
