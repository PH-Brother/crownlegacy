import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useGamificacao } from "@/hooks/useGamificacao";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import BottomNav from "@/components/BottomNav";
import GamificacaoBar from "@/components/GamificacaoBar";
import ReflexaoDiaria from "@/components/ReflexaoDiaria";
import TransacaoCard from "@/components/TransacaoCard";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, familia, buscarPerfil, buscarFamilia } = useProfile();
  const { transacoes, loading: loadingTx, buscarTransacoes, calcularTotais, useRealtimeListener } = useTransacoes();
  const { adicionarPontos } = useGamificacao();
  const navigate = useNavigate();
  const { toast } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [analiseIA, setAnaliseIA] = useState("");
  const [analisando, setAnalisando] = useState(false);

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (profile?.familia_id) {
      buscarFamilia(profile.familia_id);
      buscarTransacoes(profile.familia_id, mes, ano);
    }
  }, [profile?.familia_id, mes, ano, buscarFamilia, buscarTransacoes]);

  useRealtimeListener(profile?.familia_id ?? null);

  const totais = calcularTotais(transacoes);
  const primeiroNome = profile?.nome_completo?.split(" ")[0] || "Usuário";

  // Trial banner
  const diasTrial = familia?.plano === "trial" ? 7 : 0; // simplified

  const handleIA = useCallback(async () => {
    if (!user || !profile) return;
    setAnalisando(true);
    try {
      const categorias: Record<string, number> = {};
      transacoes.filter(t => t.tipo === "despesa").forEach(t => {
        categorias[t.categoria] = (categorias[t.categoria] || 0) + Number(t.valor);
      });
      const resultado = await gerarAnaliseFinanceira({
        receitas: totais.receitas, despesas: totais.despesas, saldo: totais.saldo,
        categorias, mes: `${MESES[mes - 1]} ${ano}`,
      });
      setAnaliseIA(resultado);
      await adicionarPontos(user.id, 15, "analise_ia", "Consultou IA financeira");
      toast({ title: "⚡ +15 pontos por usar IA!" });
    } catch (err) {
      console.error("Erro IA:", err);
      toast({ title: "Erro ao gerar análise", variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  }, [user, profile, transacoes, totais, mes, ano, adicionarPontos, toast]);

  const mudarMes = (dir: number) => {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  };

  const ultimas5 = transacoes.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : primeiroNome[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{getSaudacao()}, {primeiroNome}!</p>
            <p className="text-xs text-muted-foreground">{familia?.nome || ""}</p>
          </div>
          <span className="text-2xl">🛡️</span>
        </div>

        {/* Gamificação */}
        <GamificacaoBar pontos={profile?.pontos_total ?? 0} nivel={profile?.nivel_gamificacao ?? 1} />

        {/* Navegação mês */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">{MESES[mes - 1]} {ano}</span>
          <Button variant="ghost" size="icon" onClick={() => mudarMes(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Cards de totais */}
        {loadingTx ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Card className="gold-top-border border-success/20 bg-success/5">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-4 w-4 text-success mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-success">{formatarMoeda(totais.receitas)}</p>
              </CardContent>
            </Card>
            <Card className="gold-top-border border-destructive/20 bg-destructive/5">
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Saídas</p>
                <p className="text-sm font-bold text-destructive">{formatarMoeda(totais.despesas)}</p>
              </CardContent>
            </Card>
            <Card className={`gold-top-border ${totais.saldo >= 0 ? "border-primary/20 bg-primary/5" : "border-muted bg-muted/30"}`}>
              <CardContent className="p-3 text-center">
                <span className="text-sm mb-1 block">{totais.saldo >= 0 ? "💰" : "⚠️"}</span>
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold ${totais.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatarMoeda(totais.saldo)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reflexão */}
        <ReflexaoDiaria />

        {/* IA */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
              disabled={analisando}
              onClick={handleIA}
            >
              <Zap className="h-5 w-5 mr-2" />
              {analisando ? "Analisando..." : "⚡ Invocar Conselho IA"}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-primary/20">
            <SheetHeader>
              <SheetTitle className="text-primary">🤖 Conselho da IA</SheetTitle>
            </SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-foreground/90 max-h-[60vh] overflow-y-auto">
              {analiseIA || "Gerando análise..."}
            </div>
          </SheetContent>
        </Sheet>

        {/* Últimas transações */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
            <Button variant="link" className="text-primary text-xs p-0 h-auto" onClick={() => navigate("/transacoes")}>
              Ver todas
            </Button>
          </div>
          {loadingTx ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : ultimas5.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">📊</span>
              <p className="text-sm text-muted-foreground">Nenhuma transação neste mês</p>
              <Button variant="link" className="text-primary mt-1" onClick={() => navigate("/nova-transacao")}>
                Adicionar primeira transação
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimas5.map((t) => <TransacaoCard key={t.id} transacao={t} />)}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
