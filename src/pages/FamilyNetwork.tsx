import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Target, Trophy, Crown, Loader2, UserPlus, Edit3, Check, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { formatCurrency } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface FamilyMember {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
  pontos_total: number;
  nivel_gamificacao: number;
  role: string | null;
}

interface SharedGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
}

export default function FamilyNetwork() {
  const { user } = useAuth();
  const { profile, familia } = useProfile();
  const { familiaId } = useFamiliaId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // Admin editing states
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  const isAdmin = profile?.role === "pai" || profile?.role === "admin";

  const fetchData = useCallback(async () => {
    if (!familiaId) return;
    setLoading(true);
    const [mbRes, glRes] = await Promise.all([
      supabase.from("profiles").select("id, nome_completo, avatar_url, pontos_total, nivel_gamificacao, role").eq("familia_id", familiaId),
      supabase.from("shared_goals").select("*").eq("familia_id", familiaId).order("created_at", { ascending: false }),
    ]);
    if (mbRes.data) setMembers(mbRes.data as FamilyMember[]);
    if (glRes.data) setGoals(glRes.data as SharedGoal[]);
    setLoading(false);
  }, [familiaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createGoal = async () => {
    if (!familiaId || !user || !goalName || !goalTarget) return;
    setCreating(true);
    const { error } = await supabase.from("shared_goals").insert({
      familia_id: familiaId,
      goal_name: goalName,
      target_amount: parseFloat(goalTarget),
      deadline: goalDeadline || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } else {
      toast({ title: "Meta criada! 🎯" });
      setGoalName("");
      setGoalTarget("");
      setGoalDeadline("");
      setGoalDialogOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const sortedByPoints = [...members].sort((a, b) => (b.pontos_total || 0) - (a.pontos_total || 0));
  const totalNetWorth = 0; // Would need net_worth_snapshots join

  if (!familiaId) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
          <h1 className="text-xl font-bold text-foreground font-display">Rede Familiar</h1>
          <Card className="card-premium">
            <CardContent className="p-6 text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <div>
                <p className="text-sm font-bold text-foreground">Você ainda não tem família</p>
                <p className="text-xs text-muted-foreground mt-1">Crie ou entre em uma família para acessar a rede</p>
              </div>
              <Button className="btn-premium" onClick={() => navigate("/onboarding-family")}>
                Criar família
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[520px] px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground font-display">Rede Familiar</h1>
          <Button size="sm" variant="outline" className="border-accent/30 text-accent text-xs" onClick={() => navigate("/membros")}>
            <UserPlus className="h-3 w-3 mr-1" /> Convidar
          </Button>
        </div>

        {/* Overview */}
        <Card className="card-premium border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="h-6 w-6 text-accent" />
              <div>
                <p className="text-sm font-bold text-foreground">{familia?.nome || "Minha Família"}</p>
                <p className="text-xs text-muted-foreground">{members.length} membros · {goals.length} metas</p>
              </div>
            </div>
            {familia?.codigo_convite && (
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-muted/50 rounded px-2 py-1 font-mono text-foreground">{familia.codigo_convite}</code>
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">código</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="members">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          {/* Members */}
          <TabsContent value="members" className="space-y-3 mt-4">
            {members.map((m) => (
              <Card key={m.id} className="card-premium">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      m.nome_completo?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.nome_completo}</p>
                    <p className="text-[10px] text-muted-foreground">Nível {m.nivel_gamificacao} · {m.pontos_total} pts</p>
                  </div>
                  {m.id === user?.id && (
                    <Badge variant="outline" className="text-[10px] text-accent border-accent/30">Você</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Shared Goals */}
          <TabsContent value="goals" className="space-y-3 mt-4">
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-accent/30 text-accent text-sm">
                  <Plus className="h-4 w-4 mr-1" /> Criar Meta Compartilhada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Meta Compartilhada</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Nome da meta" value={goalName} onChange={(e) => setGoalName(e.target.value)} />
                  <Input type="number" placeholder="Valor alvo (R$)" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
                  <Input type="date" placeholder="Prazo" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
                  <Button className="w-full btn-premium" onClick={createGoal} disabled={creating || !goalName || !goalTarget}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {goals.length === 0 && (
              <Card className="card-premium">
                <CardContent className="p-6 text-center">
                  <Target className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma meta compartilhada</p>
                </CardContent>
              </Card>
            )}

            {goals.map((g) => {
              const progress = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
              return (
                <Card key={g.id} className="card-premium">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">{g.goal_name}</p>
                      {g.deadline && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(g.deadline).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <Progress value={progress} className="h-2 [&>div]:bg-accent" />
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>{formatCurrency(g.current_amount)}</span>
                      <span>{progress.toFixed(0)}%</span>
                      <span>{formatCurrency(g.target_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking" className="space-y-3 mt-4">
            {sortedByPoints.map((m, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
              return (
                <Card key={m.id} className={`card-premium ${i === 0 ? "border-accent/30" : ""}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{medal}</span>
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                      ) : (
                        m.nome_completo?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.nome_completo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-accent">{m.pontos_total}</p>
                      <p className="text-[10px] text-muted-foreground">pontos</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
