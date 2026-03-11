import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, Check, X, Loader2, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAssinatura } from "@/hooks/useAssinatura";
import { formatarData } from "@/utils/formatters";
import BottomNav from "@/components/BottomNav";

const PRICE_MENSAL = import.meta.env.VITE_STRIPE_PRICE_MENSAL || "";
const PRICE_ANUAL = import.meta.env.VITE_STRIPE_PRICE_ANUAL || "";

const RECURSOS_FREE = [
  { label: "1 banco conectado", included: true },
  { label: "5 uploads/mês", included: true },
  { label: "IA básica", included: true },
  { label: "Análise mensal", included: false },
  { label: "Relatórios detalhados", included: false },
];

const RECURSOS_PREMIUM = [
  { label: "Bancos ilimitados", included: true },
  { label: "IA completa", included: true },
  { label: "Análise financeira", included: true },
  { label: "Relatórios detalhados", included: true },
  { label: "Suporte prioritário", included: true },
];

export default function Planos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    assinatura,
    loading,
    error,
    isPremium,
    checkoutLoading,
    portalLoading,
    iniciarCheckout,
    abrirPortalCliente,
    refetch,
  } = useAssinatura();

  const [pollingCount, setPollingCount] = useState(0);

  // Handle URL params
  useEffect(() => {
    const sucesso = searchParams.get("sucesso");
    const cancelado = searchParams.get("cancelado");

    if (sucesso === "true") {
      toast({ title: "Assinatura ativada! 👑", description: "Bem-vindo ao Premium!" });
      setPollingCount(1);
    } else if (cancelado === "true") {
      toast({ title: "Checkout cancelado" });
    }
  }, [searchParams, toast]);

  // Polling after success
  useEffect(() => {
    if (pollingCount > 0 && pollingCount <= 5) {
      const timer = setTimeout(() => {
        refetch();
        setPollingCount((c) => c + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pollingCount, refetch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-[430px] px-4 py-6 space-y-6">
          <Card className="border-destructive">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground font-display">Planos</h1>

        {/* Premium status card */}
        {isPremium && assinatura && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Plano Premium Ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {formatarData(assinatura.periodo_fim?.split("T")[0] || null)}
                  </p>
                </div>
              </div>

              {assinatura.cancelar_ao_fim && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Sua assinatura será cancelada em{" "}
                    {formatarData(assinatura.periodo_fim?.split("T")[0] || null)}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full border-primary/30 text-primary"
                onClick={abrirPortalCliente}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : assinatura.cancelar_ao_fim ? (
                  "Reativar assinatura"
                ) : (
                  "Gerenciar assinatura"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Free */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Gratuito</CardTitle>
                {!isPremium && (
                  <Badge variant="secondary" className="text-xs">
                    Seu plano atual
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">Grátis</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECURSOS_FREE.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-sm">
                  {r.included ? (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={r.included ? "text-foreground" : "text-muted-foreground/60"}>
                    {r.label}
                  </span>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4" disabled>
                Plano atual
              </Button>
            </CardContent>
          </Card>

          {/* Premium Mensal */}
          <Card className="border-primary/40 shadow-lg shadow-primary/10 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground text-xs px-3">
                Mais popular
              </Badge>
            </div>
            <CardHeader className="pb-3 pt-6">
              <CardTitle className="text-base">Premium Mensal</CardTitle>
              <p className="text-2xl font-bold text-foreground">
                R$ 9,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Sem compromisso, cancele a qualquer momento
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECURSOS_PREMIUM.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{r.label}</span>
                </div>
              ))}
              <Button
                className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => iniciarCheckout(PRICE_MENSAL)}
                disabled={isPremium || checkoutLoading}
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPremium ? (
                  "Plano ativo"
                ) : (
                  "Assinar agora"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Anual */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Premium Anual</CardTitle>
                <Badge className="bg-accent text-accent-foreground text-xs">Economize 33%</Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                R$ 100,00<span className="text-sm font-normal text-muted-foreground">/ano</span>
              </p>
              <p className="text-xs text-muted-foreground">equivale a R$ 8,33/mês</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECURSOS_PREMIUM.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{r.label}</span>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4 border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => iniciarCheckout(PRICE_ANUAL)}
                disabled={isPremium || checkoutLoading}
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPremium ? (
                  "Plano ativo"
                ) : (
                  "Assinar anual"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
