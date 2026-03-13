import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAssinatura } from "@/hooks/useAssinatura";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Tier = "free" | "pro" | "premium";

interface FeatureGateProps {
  children: ReactNode;
  requiredTier?: Tier;
  featureName?: string;
  fallback?: ReactNode;
}

/**
 * Gates features by subscription tier.
 * Free users see upgrade prompt. Pro/Premium users see content.
 * Pro and Premium have identical feature access (Premium is just annual billing).
 */
export default function FeatureGate({
  children,
  requiredTier = "pro",
  featureName = "este recurso",
  fallback,
}: FeatureGateProps) {
  const { isPremium, loading } = useAssinatura();
  const navigate = useNavigate();

  if (loading) return null;

  // Pro and Premium have the same features
  const hasAccess = requiredTier === "free" || isPremium;

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
          <Lock className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h3 className="font-bold text-foreground font-display">
            {featureName} é exclusivo Pro
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Faça upgrade para desbloquear {featureName} e todos os recursos premium
          </p>
        </div>
        <div className="flex flex-col gap-2 max-w-[280px] mx-auto">
          <Button
            onClick={() => navigate("/planos")}
            className="w-full btn-premium"
          >
            <Crown className="h-4 w-4 mr-2" />
            Ver planos — US$ 9,90/mês
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Cancele a qualquer momento · 33% de desconto no anual
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
