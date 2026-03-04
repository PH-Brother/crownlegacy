import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { usePlanStatus } from "@/hooks/usePlanStatus";

const DISMISS_KEY = "paywall_banner_dismissed_at";

export default function PaywallBanner() {
  const { isTrialAtivo, diasRestantes } = usePlanStatus();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isTrialAtivo) return;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) return;
    }
    setVisible(true);
  }, [isTrialAtivo]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between"
      style={{
        background: "rgba(212,175,55,0.1)",
        borderBottom: "1px solid rgba(212,175,55,0.3)",
      }}
    >
      <div className="flex-1">
        <span className="text-sm" style={{ color: "#D4AF37" }}>
          ⏳ Faltam {diasRestantes} dias do seu período gratuito{" "}
          <button
            onClick={() => navigate("/assinatura")}
            className="underline font-semibold hover:opacity-80"
            style={{ color: "#D4AF37" }}
          >
            Garantir acesso premium →
          </button>
        </span>
      </div>
      <button onClick={handleDismiss} className="ml-2 p-1 hover:opacity-70" style={{ color: "#D4AF37" }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
