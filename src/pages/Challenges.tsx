import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Star, Trophy, CheckCircle2, XCircle, Clock, Plus, Loader2, Target, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
    </AppLayout>
  );
}
