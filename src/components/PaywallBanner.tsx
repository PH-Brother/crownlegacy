import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Crown, Sparkles } from "lucide-react";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "paywall_banner_dismissed_at";

export default function PaywallBanner() {
  const { isTrialAtivo, diasRestantes, isCancelado } = usePlanStatus();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isTrialAtivo && !isCancelado) return;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000 && !isCancelado) return;
    }
    setVisible(true);
  }, [isTrialAtivo, isCancelado]);

  const handleDismiss = () => {
    if (isCancelado) return;
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  const isExpired = isCancelado || diasRestantes === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-xl overflow-hidden mb-1"
        style={{
          background: isExpired
            ? "linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.06))"
            : "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))",
          border: isExpired
            ? "1px solid rgba(220,38,38,0.25)"
            : "1px solid rgba(212,175,55,0.25)",
        }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isExpired ? "rgba(220,38,38,0.15)" : "rgba(212,175,55,0.15)",
            }}
          >
            {isExpired ? (
              <Crown className="h-4 w-4" style={{ color: "#ef4444" }} />
            ) : (
              <Sparkles className="h-4 w-4" style={{ color: "#D4AF37" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: isExpired ? "#ef4444" : "#D4AF37" }}
            >
              {isExpired
                ? "Seu período gratuito expirou"
                : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""} no trial`}
            </p>
            <button
              onClick={() => navigate("/planos")}
              className="text-xs underline font-medium hover:opacity-80 transition-opacity"
              style={{ color: isExpired ? "#f87171" : "#E8C547" }}
            >
              {isExpired ? "Assinar agora para continuar →" : "Garantir acesso premium →"}
            </button>
          </div>
          {!isExpired && (
            <button
              onClick={handleDismiss}
              className="p-1 hover:opacity-60 transition-opacity shrink-0"
              style={{ color: "#D4AF37" }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
