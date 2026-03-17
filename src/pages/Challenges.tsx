import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Star, Trophy, CheckCircle2, XCircle, Clock, Plus, Loader2, Target, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

const DAILY_CHALLENGES = [
  {
    key: "save_food_10",
    title: "Economize 10% em Alimentação",
    description: "Gaste menos de R$ 450 em comida esta semana",
    category: "Food",
    challenge_type: "save_category" as const,
    target: 450,
    reward: { points: 50, badge: "Food Saver" },
  },
  {
    key: "no_shopping",
    title: "Sem gastos em Shopping",
    description: "Não gaste nada em shopping por 3 dias",
    category: "Shopping",
    challenge_type: "no_spend" as const,
    target: 0,
    reward: { points: 100, badge: "Disciplined Spender" },
  },
  {
    key: "transport_save",
    title: "Economize em Transporte",
    description: "Gaste menos de R$ 150 em transporte esta semana",
    category: "Transport",
    challenge_type: "save_category" as const,
    target: 150,
    reward: { points: 30, badge: "Eco Warrior" },
  },
  {
    key: "utilities_save",
    title: "Economize em Utilities",
    description: "Gaste menos de R$ 200 em utilities esta semana",
    category: "Utilities",
    challenge_type: "save_category" as const,
    target: 200,
    reward: { points: 40, badge: "Efficient Living" },
  },
];

interface Challenge {
  id: string;
  challenge_type: string;
  category: string | null;
  target_amount: number;
  actual_amount: number;
  status: string;
  streak_count: number;
  started_at: string;
  completed_at: string | null;
}

interface Reward {
  id: string;
  challenge_id: string;
  reward_type: string;
  points: number;
  badge_name: string | null;
  earned_at: string;
}

export default function Challenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Custom challenge states
  const [customOpen, setCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customTarget, setCustomTarget] = useState("0");
  const [customCategory, setCustomCategory] = useState("Outros");
  const [customPoints, setCustomPoints] = useState("25");
  const [savingCustom, setSavingCustom] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [chRes, rwRes] = await Promise.all([
      supabase.from("wisdom_challenges").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("challenge_rewards").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(50),
    ]);
    if (chRes.data) setChallenges(chRes.data as Challenge[]);
    if (rwRes.data) setRewards(rwRes.data as Reward[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPoints = rewards.reduce((s, r) => s + r.points, 0);
  const badges = rewards.filter((r) => r.badge_name).map((r) => r.badge_name!);
  const uniqueBadges = [...new Set(badges)];

  const activeChallenges = challenges.filter((c) => c.status === "active");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  const currentStreak = (() => {
    const sorted = completedChallenges.sort(
      (a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
    );
    if (!sorted.length) return 0;
    return sorted[0]?.streak_count || completedChallenges.length;
  })();

  const nextUnlock = 500;
  const progressToUnlock = Math.min(100, (totalPoints / nextUnlock) * 100);

  const startChallenge = async (template: typeof DAILY_CHALLENGES[0]) => {
    if (!user) return;
    setCreating(true);
    const { error } = await supabase.from("wisdom_challenges").insert({
      user_id: user.id,
      challenge_type: template.challenge_type,
      category: template.category,
      target_amount: template.target,
      actual_amount: 0,
      status: "active",
      streak_count: currentStreak,
    });
    if (error) {
      toast({ title: "Erro ao criar desafio", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Desafio iniciado! 🎯", description: template.title });
      fetchData();
    }
    setCreating(false);
  };

  const completeChallenge = async (challenge: Challenge) => {
    if (!user) return;
    const template = DAILY_CHALLENGES.find((t) => t.category === challenge.category);
    const rewardPoints = template?.reward.points || 25;
    const badgeName = template?.reward.badge || null;

    const [upd, rwIns] = await Promise.all([
      supabase.from("wisdom_challenges").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        streak_count: (challenge.streak_count || 0) + 1,
      }).eq("id", challenge.id),
      supabase.from("challenge_rewards").insert({
        user_id: user.id,
        challenge_id: challenge.id,
        reward_type: badgeName ? "badge" : "points",
        points: rewardPoints,
        badge_name: badgeName,
      }),
    ]);

    if (upd.error || rwIns.error) {
      toast({ title: "Erro", variant: "destructive" });
    } else {
      toast({ title: `🎉 +${rewardPoints} pontos${badgeName ? ` + Badge "${badgeName}"` : ""}!` });
      fetchData();
    }
  };

  const saveCustomChallenge = async () => {
    if (!user || !customTitle.trim()) {
      toast({ title: "Dê um título ao seu desafio", variant: "destructive" });
      return;
    }
    setSavingCustom(true);
    try {
      const { error } = await supabase.from("wisdom_challenges").insert({
        user_id: user.id,
        challenge_type: "custom",
        category: customCategory,
        target_amount: Number(customTarget) || 0,
        actual_amount: 0,
        status: "active",
        streak_count: currentStreak,
      });
      if (error) throw error;
      toast({ title: `🎯 Desafio "${customTitle}" criado! Bora vencer!` });
      setCustomOpen(false);
      setCustomTitle("");
      setCustomDesc("");
      setCustomTarget("0");
      setCustomCategory("Outros");
      setCustomPoints("25");
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao criar desafio", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSavingCustom(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-accent" />;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[520px] px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-foreground font-display">Desafios de Sabedoria</h1>

        {/* Streak + Points */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-premium">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-mono font-bold text-foreground">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">dias de streak</p>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-1 text-accent" />
              <p className="text-2xl font-mono font-bold text-foreground">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">pontos</p>
              <Progress value={progressToUnlock} className="h-1.5 mt-2 [&>div]:bg-accent" />
              <p className="text-[10px] text-muted-foreground mt-1">{progressToUnlock.toFixed(0)}% → próximo unlock</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Desafios Ativos</h2>
            {activeChallenges.map((ch) => {
              const progress = ch.target_amount > 0
                ? Math.min(100, ((ch.target_amount - ch.actual_amount) / ch.target_amount) * 100)
                : ch.actual_amount === 0 ? 100 : 0;
              const template = DAILY_CHALLENGES.find((t) => t.category === ch.category);
              return (
                <Card key={ch.id} className="card-premium border-accent/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {template?.title || ch.category}
                        </p>
                        <p className="text-xs text-muted-foreground">{template?.description}</p>
                      </div>
                      <Badge variant="outline" className="text-accent border-accent/30 text-[10px]">
                        +{template?.reward.points || 25} pts
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-2 [&>div]:bg-accent" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground font-mono">
                        R$ {ch.actual_amount.toFixed(0)} / R$ {ch.target_amount.toFixed(0)}
                      </span>
                      <Button
                        size="sm"
                        className="btn-premium text-xs h-7"
                        onClick={() => completeChallenge(ch)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Completar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Custom Challenge CTA */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Criar meu desafio</h2>
          <button
            onClick={() => setCustomOpen(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--accent) / 0.05))",
              border: "1px solid hsl(var(--accent) / 0.3)",
            }}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
              ✨
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Desafio Personalizado</p>
              <p className="text-xs text-muted-foreground">Crie um desafio de acordo com seus hábitos e metas</p>
            </div>
            <ChevronRight className="h-4 w-4 text-accent shrink-0" />
          </button>
        </div>

        {/* Start New Challenge */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Iniciar Novo Desafio</h2>
          <div className="grid gap-2">
            {DAILY_CHALLENGES.map((t) => {
              const alreadyActive = activeChallenges.some((c) => c.category === t.category);
              return (
                <Card key={t.key} className={`card-premium ${alreadyActive ? "opacity-50" : "hover:border-accent/30 cursor-pointer"}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent/30 text-accent text-xs h-7"
                      disabled={alreadyActive || creating}
                      onClick={() => startChallenge(t)}
                    >
                      {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        {uniqueBadges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Badges Conquistados</h2>
            <div className="grid grid-cols-2 gap-2">
              {uniqueBadges.map((badge) => (
                <Card key={badge} className="card-premium">
                  <CardContent className="p-3 text-center">
                    <Trophy className="h-6 w-6 mx-auto mb-1 text-accent" />
                    <p className="text-xs font-bold text-foreground">{badge}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {uniqueBadges.length === 0 && (
          <Card className="card-premium">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum badge conquistado ainda</p>
              <p className="text-xs text-muted-foreground">Complete desafios para ganhar badges!</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {completedChallenges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico</h2>
            {completedChallenges.slice(0, 10).map((ch) => {
              const template = DAILY_CHALLENGES.find((t) => t.category === ch.category);
              return (
                <Card key={ch.id} className="card-premium">
                  <CardContent className="p-3 flex items-center gap-3">
                    {getStatusIcon(ch.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {template?.title || ch.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ch.completed_at ? new Date(ch.completed_at).toLocaleDateString("pt-BR") : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                      +{template?.reward.points || 25} pts
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Challenge Dialog */}
      <Dialog open={customOpen} onOpenChange={(o) => !o && setCustomOpen(false)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>✨ Criar Desafio Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do desafio *</Label>
              <Input
                placeholder="Ex: Não pedir delivery por 7 dias"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value.slice(0, 80))}
                className="min-h-[44px]"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva seu desafio..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value.slice(0, 200))}
                className="min-h-[72px] resize-none"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-input text-foreground outline-none text-sm"
                >
                  <option value="Alimentação">🍽️ Alimentação</option>
                  <option value="Transporte">🚗 Transporte</option>
                  <option value="Lazer">🎉 Lazer</option>
                  <option value="Compras">🛍️ Compras</option>
                  <option value="Saúde">❤️ Saúde</option>
                  <option value="Poupança">💰 Poupança</option>
                  <option value="Outros">📦 Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Meta (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  min={0}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recompensa em pontos</Label>
              <select
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-input text-foreground outline-none text-sm"
              >
                <option value="25">25 pontos — Desafio leve</option>
                <option value="50">50 pontos — Desafio médio</option>
                <option value="100">100 pontos — Desafio difícil</option>
                <option value="200">200 pontos — Desafio extremo</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveCustomChallenge}
              disabled={savingCustom || !customTitle.trim()}
              className="gradient-gold text-primary-foreground font-bold"
            >
              {savingCustom ? "Criando..." : "🎯 Criar Desafio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
