import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAssinatura } from "@/hooks/useAssinatura";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type Tier = "free" | "pro" | "premium";

interface FeatureGateProps {
  children: ReactNode;
  requiredTier?: Tier;
  featureName?: string;
  preview?: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({
  children,
  requiredTier = "pro",
  featureName = "este recurso",
  preview,
  fallback,
}: FeatureGateProps) {
  const { isPremium, loading } = useAssinatura();
  const navigate = useNavigate();

  if (loading) return null;

  const hasAccess = requiredTier === "free" || isPremium;
  if (hasAccess) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Preview borrado */}
      {preview && (
        <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.5 }}>
          {preview}
        </div>
      )}

      {/* Overlay CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`${preview ? "absolute inset-0" : ""} flex items-center justify-center`}
        style={{
          background: preview
            ? "linear-gradient(to top, hsl(var(--card)) 60%, hsl(var(--card) / 0.85) 100%)"
            : undefined,
          backdropFilter: preview ? "blur(2px)" : undefined,
        }}
      >
        <div className="text-center px-6 py-8 space-y-4 max-w-[300px]">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--accent) / 0.05))",
              border: "1px solid hsl(var(--accent) / 0.3)",
            }}
          >
            <Lock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">
              Crown & Legacy Premium
            </p>
            <h3 className="font-bold text-foreground font-display text-base">
              {featureName} disponível no Premium
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Desbloqueie análises completas, IA avançada e planejamento de legado familiar.
            </p>
          </div>
          <Button
            onClick={() => navigate("/planos")}
            className="w-full btn-accent gap-2 min-h-[44px]"
          >
            <Crown className="h-4 w-4" />
            Ver planos
          </Button>
          <p className="text-[10px] text-muted-foreground">
            A partir de U$ 9,90/mês · Cancele quando quiser
          </p>
        </div>
      </motion.div>

      {/* Se não tem preview, mostra placeholder */}
      {!preview && (
        <div className="h-40 rounded-2xl" style={{ background: "hsl(var(--muted) / 0.3)" }} />
      )}
    </div>
  );
}
