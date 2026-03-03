import { useState, useCallback } from "react";
import { useProfile } from "./useProfile";

export function useAssinatura() {
  const { familia } = useProfile();
  const [loading, setLoading] = useState(false);

  const status = familia?.plano || "trial";
  const isActive = status === "premium" || status === "active";

  const diasRestantes = useCallback(() => {
    // Simplified - would need data_fim_trial from familia
    return 7;
  }, []);

  const iniciarCheckout = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Integrate with Stripe
      // TODO: Integrate with Stripe
    } finally {
      setLoading(false);
    }
  }, []);

  const abrirPortal = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Integrate with Stripe Portal
      // TODO: Integrate with Stripe Portal
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, isActive, diasRestantes: diasRestantes(), loading, iniciarCheckout, abrirPortal };
}
