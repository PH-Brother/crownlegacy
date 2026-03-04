import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallGateProps {
  feature: string;
  children: ReactNode;
}

export default function PaywallGate({ feature, children }: PaywallGateProps) {
  const { isPremium, isTrialAtivo, isCancelado, loading } = usePlanStatus();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isPremium || isTrialAtivo) {
    return <>{children}</>;
  }

  if (isCancelado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
        <div className="card-premium p-8 max-w-[400px] w-full text-center space-y-6">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.3)" }}
          >
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground font-display">Seu período gratuito encerrou</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Assine para continuar acessando o Legacy Kingdom
            </p>
          </div>
          <Button
            onClick={() => navigate("/assinatura")}
            className="w-full min-h-[48px] btn-premium text-base"
          >
            Assinar agora — US$ 9,90/mês
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
