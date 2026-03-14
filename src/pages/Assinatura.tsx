import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import BottomNav from "@/components/BottomNav";

const BENEFICIOS = [
  "Transações ilimitadas",
  "Análise com IA personalizada",
  "Upload e análise de faturas",
  "Relatórios detalhados",
  "Membros ilimitados na família",
  "Metas financeiras",
  "Suporte prioritário",
  "Sem anúncios",
];

export default function Assinatura() {
  const { user } = useAuth();
  const { familia } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isActive = familia?.plano === "premium" || familia?.plano === "active";

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // TODO: Integrate with Stripe Checkout
      toast({ title: "🔧 Integração com Stripe em breve!", description: "Por enquanto, aproveite o trial." });
    } catch {
      toast({ title: "Erro ao iniciar checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Assinatura</h1>
        </div>

        {/* Status */}
        <Card className={isActive ? "card-glass-gold" : "card-glass"}>
          <CardContent className="p-5 text-center">
            <Crown className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-1">
              {isActive ? "Plano Premium Ativo" : "Crown & Legacy Premium"}
            </h2>
            <p className="text-3xl font-bold text-primary mb-1">U$ 9,90<span className="text-sm text-muted-foreground">/mês</span></p>
            <p className="text-sm text-accent font-medium">ou U$ 99,90/ano <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent ml-1">Economize 30%</span></p>
            {!isActive && <p className="text-sm text-muted-foreground">7 dias grátis para experimentar</p>}
          </CardContent>
        </Card>

        {/* Benefícios */}
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Benefícios Premium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {BENEFICIOS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full gradient-gold flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {isActive ? (
          <Button
            variant="outline"
            className="w-full min-h-[48px] border-primary/30 text-primary"
            onClick={() => toast({ title: "🔧 Portal de gerenciamento em breve!" })}
          >
            Gerenciar Assinatura
          </Button>
        ) : (
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold text-base"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🚀 Começar 7 Dias Grátis"}
          </Button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
