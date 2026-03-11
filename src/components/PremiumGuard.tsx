import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAssinatura } from "@/hooks/useAssinatura";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PremiumGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPlan?: "premium" | "premium_anual";
}

export default function PremiumGuard({ children, fallback, requiredPlan }: PremiumGuardProps) {
  const { isPremium, assinatura, loading } = useAssinatura();
  const navigate = useNavigate();

  if (loading) return null;

  const planMatches = requiredPlan
    ? assinatura?.plano === requiredPlan && assinatura?.status === "active"
    : isPremium;

  if (planMatches) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Recurso exclusivo Premium</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Assine agora para desbloquear este recurso
          </p>
        </div>
        <Button
          onClick={() => navigate("/planos")}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Ver planos
        </Button>
      </CardContent>
    </Card>
  );
}
