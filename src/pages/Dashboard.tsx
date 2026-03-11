import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Shield, Sparkles, TrendingUp, TrendingDown, Plus, BarChart3, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Loader2, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useFinancialScore, getScoreColor, getScoreLabel } from "@/hooks/useFinancialScore";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency, formatPercentage, calculateVariation } from "@/utils/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import PaywallBanner from "@/components/PaywallBanner";
import GamificacaoBar from "@/components/GamificacaoBar";
import ReflexaoDiaria from "@/components/ReflexaoDiaria";
import NetWorthChart, { NetWorthChartSkeleton } from "@/components/dashboard/NetWorthChart";
import InsightCard from "@/components/InsightCard";
import GradientCard from "@/components/ui/GradientCard";
import { useAIInsights } from "@/hooks/useAIInsights";
import { useWealthGoals } from "@/hooks/useWealthGoals";
import { calculateDaysRemaining, calculateGoalProgress, getGoalProgressColor } from "@/utils/goalHelpers";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

function NextGoalCard() {
  const navigate = useNavigate();
  const { goals, loading } = useWealthGoals();
  const activeGoals = goals.filter((g) => g.status === "active").sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
  const next = activeGoals[0] || null;

  if (loading) return <Skeleton className="h-20 rounded-2xl" />;

  if (!next) {
    return (
      <Card className="card-premium">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Crie sua primeira meta de patrimônio</p>
          <Button size="sm" className="mt-2 btn-premium" onClick={() => navigate("/goals")}>
            <Target className="h-4 w-4 mr-1" /> Criar meta
          </Button>
        </CardContent>
      </Card>);

  }

  const days = calculateDaysRemaining(next.target_date);
  const percent = calculateGoalProgress(next.current_value, next.target_value);
  const color = getGoalProgressColor(percent);

  return (
    <Card className="card-premium cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/goals")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próxima Meta</span>
          <span className="text-xs font-medium" style={{ color }}>{days > 0 ? `${days} dias` : "Vencida"}</span>
        </div>
        <p className="text-sm font-bold text-foreground">{next.title}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono">{formatCurrency(next.current_value)}</span>
            <span className="font-bold" style={{ color }}>{percent.toFixed(0)}%</span>
            <span className="text-muted-foreground font-mono">{formatCurrency(next.target_value)}</span>
          </div>
          <Progress value={percent} className="h-1.5 [&>div]:bg-primary" />
        </div>
      </CardContent>
    </Card>);

}

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { familiaId, isLoading: loadingFamilia } = useFamiliaId();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [themeRotating, setThemeRotating] = useState(false);

  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());

  const { pontos, nivel, isLoading: loadingDash, error: dashError, refetch: refetchDash } = useDashboardData(familiaId, user?.id ?? null, mes, ano);
  const { assets, snapshots, transacoes: nwTransacoes, loading: loadingNW, error: nwError, netWorth, refetch: refetchNW } = useNetWorth();
  const { calculateScore } = useFinancialScore();

  const [scoreData, setScoreData] = useState<{score: number;level: string;pilares: {liquidity: number;debt_ratio: number;saving: number;wealth_growth: number;};} | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showPilares, setShowPilares] = useState(false);

  const { insights, loading: insightsLoading, isGenerating, generateNewInsights, markAsRead } = useAIInsights();

  const primeiroNome = profile?.nome_completo?.split(" ")[0] || "Usuário";
  const loading = loadingFamilia || loadingDash || loadingNW;

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (!loadingNW && assets) {
      setScoreLoading(true);
      calculateScore(assets, nwTransacoes, snapshots).
      then((result) => setScoreData(result)).
      catch(() => {}).
      finally(() => setScoreLoading(false));
    }
  }, [loadingNW, assets, nwTransacoes, snapshots, calculateScore]);

  const firstUnread = insights.find((i) => !i.is_read) || insights[0] || null;

  const cashflow = (() => {
    const currentMonth = new Date();
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const filtered = nwTransacoes.filter((t) => {
      const d = new Date(t.data_transacao);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const receitas = filtered.filter((t) => t.tipo === "receita").reduce((s, t) => s + Number(t.valor), 0);
    const despesas = filtered.filter((t) => t.tipo === "despesa").reduce((s, t) => s + Number(t.valor), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  })();

  const nwVariation = (() => {
    if (snapshots.length < 2) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldSnapshot = snapshots.find((s) => new Date(s.snapshot_date) <= thirtyDaysAgo) || snapshots[0];
    const oldNW = oldSnapshot.net_worth ?? oldSnapshot.total_assets;
    return calculateVariation(netWorth, oldNW);
  })();

  const handleRefetch = useCallback(() => {
    refetchNW();
    refetchDash();
  }, [refetchNW, refetchDash]);

  const errorMsg = dashError || nwError;

  return (
    <div className="mx-auto max-w-[520px] px-4 py-4 space-y-4">
      <PaywallBanner />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/perfil")} className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden">
          {profile?.avatar_url ?
          <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> :
          primeiroNome[0]?.toUpperCase()}
        </button>
        <div className="flex-1">
          <p className="font-display font-semibold text-foreground text-sm">{getSaudacao()}, {primeiroNome}!</p>
          <p className="text-xs text-accent font-medium">Wealth Intelligence</p>
        </div>
        <button
          onClick={() => {setThemeRotating(true);toggleTheme();setTimeout(() => setThemeRotating(false), 400);}}
          className="h-9 w-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors"
          style={{ transition: "transform 0.3s ease", transform: themeRotating ? "rotate(360deg)" : "rotate(0deg)" }}>
          
          <span className="text-base">{theme === "obsidian" ? "☀️" : "🌑"}</span>
        </button>
        <img alt="Crown & Legacy" className="w-10 h-10 drop-shadow-[0_0_10px_hsl(var(--accent)/0.4)] object-cover rounded-xl" src="/lovable-uploads/d14cf31d-f436-42e2-ab61-e86927359604.png" />
      </div>

      {/* Error State */}
      {errorMsg &&
      <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Erro ao carregar dados</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefetch} className="gap-1">
              <RefreshCw className="h-3 w-3" /> Tentar
            </Button>
          </CardContent>
        </Card>
      }

      {/* SECTION 1 — Net Worth Hero */}
      {loadingNW ?
      <Skeleton className="h-36 rounded-2xl" /> :

      <GradientCard variant="accent">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Patrimônio Líquido</span>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-bold tracking-tight">
            {formatCurrency(netWorth)}
          </p>
          {nwVariation &&
        <p className={`text-xs mt-1 font-medium ${nwVariation.isPositive ? "opacity-90" : "text-destructive"}`}>
              {nwVariation.isPositive ? "+" : ""}{formatCurrency(nwVariation.value)} ({formatPercentage(nwVariation.percentage)}) vs 30 dias
            </p>
        }
          {assets.length === 0 &&
        <button className="text-xs underline mt-2 opacity-80" onClick={() => navigate("/assets")}>
              + Adicionar ativos
            </button>
        }
          {snapshots.length > 1 &&
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex items-center gap-1 text-xs mt-3 opacity-80 hover:opacity-100">
          
              {showChart ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showChart ? "Ocultar histórico" : "Ver histórico 3 meses"}
            </button>
        }
          {showChart && <div className="mt-3 bg-background/10 rounded-xl p-2"><NetWorthChart data={snapshots} height={200} /></div>}
        </GradientCard>
      }

      {/* SECTION 2 — Financial Score */}
      <Card className="card-premium">
        <CardContent className="p-5">
          {scoreLoading ?
          <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div> :
          scoreData ?
          <>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3" />
                  
                    <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={getScoreColor(scoreData.level)}
                    strokeWidth="3"
                    strokeDasharray={`${scoreData.score / 1000 * 100}, 100`}
                    strokeLinecap="round" />
                  
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="h-5 w-5" style={{ color: getScoreColor(scoreData.level) }} />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Financeiro</span>
                  <p className="text-xl font-mono font-bold" style={{ color: getScoreColor(scoreData.level) }}>
                    {scoreData.score}<span className="text-sm text-muted-foreground font-normal">/1000</span>
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: getScoreColor(scoreData.level) }}>
                    {getScoreLabel(scoreData.level)}
                  </p>
                </div>
              </div>
              <button
              onClick={() => setShowPilares(!showPilares)}
              className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline">
              
                {showPilares ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showPilares ? "Ocultar pilares" : "Ver pilares"}
              </button>
              {showPilares &&
            <div className="mt-3 space-y-2">
                  {[
              { label: "Liquidez", value: scoreData.pilares.liquidity },
              { label: "Endividamento", value: scoreData.pilares.debt_ratio },
              { label: "Poupança", value: scoreData.pilares.saving },
              { label: "Crescimento", value: scoreData.pilares.wealth_growth }].
              map((p) =>
              <div key={p.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">{p.label}</span>
                        <span className="font-medium font-mono text-foreground">{p.value}/250</span>
                      </div>
                      <Progress value={p.value / 250 * 100} className="h-1.5 [&>div]:bg-primary" />
                    </div>
              )}
                </div>
            }
            </> :
          null}
        </CardContent>
      </Card>

      {/* SECTION 3 — AI Insight */}
      <Card className="card-glass-gold">
        <CardContent className="p-4">
          {insightsLoading ?
          <Skeleton className="h-12 w-full" /> :
          firstUnread ?
          <div className="space-y-3">
              <InsightCard insight={firstUnread} onMarkAsRead={markAsRead} />
              <div className="flex items-center gap-2">
                <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 border-accent/20"
                onClick={generateNewInsights}
                disabled={isGenerating}>
                
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Gerar novo
                </Button>
                <Button
                size="sm"
                variant="ghost"
                className="text-xs text-accent"
                onClick={() => navigate("/insights")}>
                
                  Ver todos
                </Button>
              </div>
            </div> :

          <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Insight do Dia</p>
                <p className="text-sm text-foreground leading-relaxed mb-2 font-serif">
                  Gere seu primeiro insight com a IA.
                </p>
                <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 border-accent/20"
                onClick={generateNewInsights}
                disabled={isGenerating}>
                
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Gerar insights
                </Button>
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {/* SECTION 4 — Cashflow */}
      {loading ?
      <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div> :

      <div className="grid grid-cols-3 gap-2">
          <Card className="card-premium cursor-pointer hover:border-success/30 transition-colors" onClick={() => navigate("/transacoes")}>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
              <p className="text-[10px] text-muted-foreground">Receitas</p>
              <p className="text-sm font-bold text-success tracking-tight font-mono">{formatCurrency(cashflow.receitas)}</p>
            </CardContent>
          </Card>
          <Card className="card-premium cursor-pointer hover:border-destructive/30 transition-colors" onClick={() => navigate("/transacoes")}>
            <CardContent className="p-3 text-center">
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
              <p className="text-[10px] text-muted-foreground">Despesas</p>
              <p className="text-sm font-bold text-destructive tracking-tight font-mono">{formatCurrency(cashflow.despesas)}</p>
            </CardContent>
          </Card>
          <Card className="card-premium cursor-pointer hover:border-accent/30 transition-colors" onClick={() => navigate("/transacoes")}>
            <CardContent className="p-3 text-center">
              <span className="text-sm mb-1 block">{cashflow.saldo >= 0 ? "💰" : "⚠️"}</span>
              <p className="text-[10px] text-muted-foreground">Saldo</p>
              <p className={`text-sm font-bold tracking-tight font-mono ${cashflow.saldo >= 0 ? "text-accent" : "text-destructive"}`}>
                {formatCurrency(cashflow.saldo)}
              </p>
            </CardContent>
          </Card>
        </div>
      }

      {/* SECTION 5 — Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 text-sm gap-2 border-primary/20 hover:bg-primary/5" onClick={() => navigate("/assets")}>
          <Plus className="h-4 w-4 text-accent" /> Adicionar ativo
        </Button>
        <Button variant="outline" className="h-12 text-sm gap-2 border-primary/20 hover:bg-primary/5" onClick={() => navigate("/nova-transacao")}>
          <Plus className="h-4 w-4 text-accent" /> Registrar transação
        </Button>
        <Button variant="outline" className="h-12 text-sm gap-2 border-primary/20 hover:bg-primary/5" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <TrendingUp className="h-4 w-4 text-accent" /> Ver score
        </Button>
        <Button variant="outline" className="h-12 text-sm gap-2 border-primary/20 hover:bg-primary/5" onClick={() => navigate("/relatorios")}>
          <BarChart3 className="h-4 w-4 text-accent" /> Relatório
        </Button>
      </div>

      {/* SECTION 6 — Next Goal */}
      <NextGoalCard />

      {/* SECTION 7 — Gamification */}
      <GamificacaoBar pontos={pontos} nivel={nivel} />

      {/* SECTION 8 — Daily Reflection */}
      <ReflexaoDiaria />
    </div>);

}