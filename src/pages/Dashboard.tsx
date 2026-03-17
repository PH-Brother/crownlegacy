import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Shield, Sparkles, TrendingUp, TrendingDown, Plus, BarChart3, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Loader2, Target, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import logo from "@/assets/logo-CL-Verde-dourado-Gold-claro.png";
import { supabase } from "@/integrations/supabase/client";

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

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
      </Card>
    );
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
    </Card>
  );
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

  const [scoreData, setScoreData] = useState<{score: number; level: string; pilares: {liquidity: number; debt_ratio: number; saving: number; wealth_growth: number;}; } | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [showPilares, setShowPilares] = useState(false);

  const [valoresVisiveis, setValoresVisiveis] = useState(() => {
    return localStorage.getItem("cl_valores_visiveis") !== "false";
  });

  const toggleValores = () => {
    setValoresVisiveis((v) => {
      localStorage.setItem("cl_valores_visiveis", String(!v));
      return !v;
    });
  };

  const { insights, loading: insightsLoading, isGenerating, generateNewInsights, markAsRead } = useAIInsights();

  const primeiroNome = profile?.nome_completo?.split(" ")[0] || "Usuário";
  const loading = loadingFamilia || loadingDash || loadingNW;

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (!loadingNW && assets) {
      setScoreLoading(true);
      calculateScore(assets, nwTransacoes, snapshots)
        .then((result) => setScoreData(result))
        .catch(() => {})
        .finally(() => setScoreLoading(false));
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
    <motion.div
      className="mx-auto max-w-[520px] px-4 py-4 space-y-4"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      <PaywallBanner />

      {/* Header */}
      <motion.div variants={sectionVariants} className="flex items-center gap-3">
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
          onClick={() => { setThemeRotating(true); toggleTheme(); setTimeout(() => setThemeRotating(false), 400); }}
          className="h-9 w-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors"
          style={{ transition: "transform 0.3s ease", transform: themeRotating ? "rotate(360deg)" : "rotate(0deg)" }}
        >
          <span className="text-base">{theme === "obsidian" ? "☀️" : "🌑"}</span>
        </button>
        <img alt="Crown & Legacy" className="w-10 h-10 drop-shadow-[0_0_10px_hsl(var(--accent)/0.4)] object-cover rounded-xl" src="/lovable-uploads/d14cf31d-f436-42e2-ab61-e86927359604.png" />
      </motion.div>

      {/* Error State */}
      {errorMsg && (
        <motion.div variants={sectionVariants}>
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
        </motion.div>
      )}

      {/* SECTION 1 — Net Worth Hero */}
      <motion.div variants={sectionVariants}>
        {loadingNW ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))" }}
          >
            <div className="p-5 space-y-3">
              <Skeleton className="h-3 w-32 bg-white/10" />
              <Skeleton className="h-8 w-48 bg-white/10" />
              <Skeleton className="h-3 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-20 w-full bg-white/5" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 60%, hsl(var(--primary-light)) 100%)",
              boxShadow: "0 8px 32px hsl(var(--primary) / 0.35)",
            }}
          >
            {/* Glow decoration */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
              style={{
                background: "radial-gradient(circle, hsl(var(--accent-light)), transparent)",
                transform: "translate(30%, -30%)",
              }}
            />

            <div className="p-5 pb-3 relative z-10">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-white/70" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                    Patrimônio Líquido
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleValores}
                    className="h-7 w-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                    title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
                  >
                    {valoresVisiveis ? (
                      <Eye className="h-4 w-4 text-white/60" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-white/60" />
                    )}
                  </button>
                  <button
                    onClick={refetchNW}
                    className="h-7 w-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-white/60 ${loadingNW ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Value */}
              <AnimatePresence mode="wait">
                {valoresVisiveis ? (
                  <motion.p
                    key="valor"
                    initial={{ opacity: 0, filter: "blur(8px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(8px)" }}
                    transition={{ duration: 0.25 }}
                    className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white"
                  >
                    {formatCurrency(netWorth)}
                  </motion.p>
                ) : (
                  <motion.p
                    key="hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white/40 select-none"
                  >
                    R$ ••••••••
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Variation */}
              {nwVariation && valoresVisiveis && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-xs mt-1 font-medium ${nwVariation.isPositive ? "text-green-300" : "text-red-300"}`}
                >
                  {nwVariation.isPositive ? "↑" : "↓"} {formatCurrency(Math.abs(nwVariation.value))} ({formatPercentage(nwVariation.percentage)}) vs 30 dias
                </motion.p>
              )}

              {assets.length === 0 && (
                <button
                  className="text-xs underline mt-2 text-white/60 hover:text-white/80"
                  onClick={() => navigate("/assets")}
                >
                  + Adicionar primeiro ativo
                </button>
              )}
            </div>

            {/* Mini chart */}
            {snapshots.length > 1 && (
              <div className="px-2 pb-2 relative z-10" style={{ opacity: valoresVisiveis ? 1 : 0.3 }}>
                <NetWorthChart data={snapshots} height={80} />
              </div>
            )}

            {/* Empty chart state */}
            {snapshots.length <= 1 && (
              <div className="px-5 pb-4 relative z-10">
                <div className="h-12 flex items-center gap-1">
                  {[20, 35, 28, 45, 38, 55, 48, 62, 55, 70, 65, 80].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-white/10"
                      style={{ height: `${h}%`, transition: "height 0.3s ease" }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/40 mt-1">Histórico disponível após cadastrar ativos</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* SECTION 2 — Financial Score */}
      <motion.div variants={sectionVariants}>
        <Card className="card-premium">
          <CardContent className="p-5">
            {scoreLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : scoreData ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={getScoreColor(scoreData.level)}
                        strokeWidth="3"
                        strokeDasharray={`${(scoreData.score / 1000) * 100}, 100`}
                        strokeLinecap="round"
                      />
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
                  className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                >
                  {showPilares ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showPilares ? "Ocultar pilares" : "Ver pilares"}
                </button>
                {showPilares && (
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Liquidez", value: scoreData.pilares.liquidity },
                      { label: "Endividamento", value: scoreData.pilares.debt_ratio },
                      { label: "Poupança", value: scoreData.pilares.saving },
                      { label: "Crescimento", value: scoreData.pilares.wealth_growth },
                    ].map((p) => (
                      <div key={p.label}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">{p.label}</span>
                          <span className="font-medium font-mono text-foreground">{p.value}/250</span>
                        </div>
                        <Progress value={(p.value / 250) * 100} className="h-1.5 [&>div]:bg-primary" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* SECTION 3 — AI Insight */}
      <motion.div variants={sectionVariants}>
        <Card className="card-glass-gold">
          <CardContent className="p-4">
            {insightsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : firstUnread ? (
              <div className="space-y-3">
                <InsightCard insight={firstUnread} onMarkAsRead={markAsRead} />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1 border-accent/20" onClick={generateNewInsights} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Gerar novo
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-accent" onClick={() => navigate("/insights")}>
                    Ver todos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Insight do Dia</p>
                  <p className="text-sm text-foreground leading-relaxed mb-2 font-serif">
                    Gere seu primeiro insight com a IA.
                  </p>
                  <Button size="sm" variant="outline" className="text-xs gap-1 border-accent/20" onClick={generateNewInsights} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Gerar insights
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* SECTION 4 — Cashflow */}
      <motion.div variants={sectionVariants}>
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Card className="card-premium cursor-pointer hover:border-success/30 transition-colors" onClick={() => navigate("/transacoes")}>
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
                <p className="text-[10px] text-muted-foreground">Receitas</p>
                <p className="text-sm font-bold text-success tracking-tight font-mono">
                  {valoresVisiveis ? formatCurrency(cashflow.receitas) : "•••"}
                </p>
              </CardContent>
            </Card>
            <Card className="card-premium cursor-pointer hover:border-destructive/30 transition-colors" onClick={() => navigate("/transacoes")}>
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
                <p className="text-[10px] text-muted-foreground">Despesas</p>
                <p className="text-sm font-bold text-destructive tracking-tight font-mono">
                  {valoresVisiveis ? formatCurrency(cashflow.despesas) : "•••"}
                </p>
              </CardContent>
            </Card>
            <Card className="card-premium cursor-pointer hover:border-accent/30 transition-colors" onClick={() => navigate("/transacoes")}>
              <CardContent className="p-3 text-center">
                <span className="text-sm mb-1 block">{cashflow.saldo >= 0 ? "💰" : "⚠️"}</span>
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold tracking-tight font-mono ${cashflow.saldo >= 0 ? "text-accent" : "text-destructive"}`}>
                  {valoresVisiveis ? formatCurrency(cashflow.saldo) : "•••"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* SECTION 5 — Quick Actions */}
      <motion.div variants={sectionVariants}>
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
      </motion.div>

      {/* SECTION 6 — Next Goal */}
      <motion.div variants={sectionVariants}>
        <NextGoalCard />
      </motion.div>

      {/* SECTION 7 — Gamification */}
      <motion.div variants={sectionVariants}>
        <GamificacaoBar pontos={pontos} nivel={nivel} />
      </motion.div>

      {/* SECTION 8 — Daily Reflection */}
      <motion.div variants={sectionVariants}>
        <ReflexaoDiaria />
      </motion.div>
    </motion.div>
  );
}
