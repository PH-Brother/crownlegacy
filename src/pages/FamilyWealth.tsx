import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Users, UserPlus, Target, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyWealth } from "@/hooks/useFamilyWealth";
import { formatCurrency } from "@/utils/formatters";
import { calculateGoalProgress } from "@/utils/goalHelpers";
import GoalCard from "@/components/GoalCard";
import GradientCard from "@/components/ui/GradientCard";

export default function FamilyWealth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, totalNetWorth, familyGoals, loading, error, inviteMember, refetch } = useFamilyWealth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    setSending(true);
    await inviteMember(email);
    setSending(false);
    setEmail("");
    setInviteOpen(false);
  };

  return (
    <div className="mx-auto max-w-[520px] px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground font-display">Patrimônio Familiar</h1>
        </div>
        <Button size="sm" className="btn-premium" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Convidar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Visão consolidada da riqueza da família</p>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}><RefreshCw className="h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Family Net Worth */}
      {loading ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : (
        <GradientCard variant="accent">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Patrimônio Familiar Total</span>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-bold">{formatCurrency(totalNetWorth)}</p>
          <p className="text-xs opacity-70 mt-1">{members.length} membro(s)</p>
        </GradientCard>
      )}

      {/* Members */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Membros da Família
        </p>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : members.length === 0 ? (
          <Card className="card-premium">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Você é o único membro da família</p>
              <Button size="sm" className="mt-2 btn-premium" onClick={() => setInviteOpen(true)}>
                Convidar primeiro membro
              </Button>
            </CardContent>
          </Card>
        ) : (
          members.map((m) => (
            <Card key={m.id} className="card-premium">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                  ) : (
                    m.nome_completo?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{m.nome_completo}</p>
                    {m.id === user?.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">Você</span>
                    )}
                    {m.role === "admin" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">Admin</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(m.netWorth)} • {m.activeGoals} meta(s)
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Family Goals */}
      {familyGoals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Metas da Família
            </p>
            <Button variant="link" className="text-xs text-accent p-0 h-auto" onClick={() => navigate("/goals")}>
              Ver todas
            </Button>
          </div>
          {familyGoals.slice(0, 3).map((g) => (
            <GoalCard key={g.id} goal={g} compact />
          ))}
        </div>
      )}

      {/* Family Insights */}
      <Card className="card-glass-gold">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Resumo Familiar</p>
          <p className="text-sm text-foreground">• {members.length} membro(s) ativo(s)</p>
          <p className="text-sm text-foreground">• {familyGoals.length} meta(s) ativa(s) na família</p>
          {familyGoals.length > 0 && (
            <p className="text-sm text-foreground">
              • Meta mais avançada: {familyGoals.reduce((best, g) =>
                calculateGoalProgress(g.current_value, g.target_value) > calculateGoalProgress(best.current_value, best.target_value) ? g : best
              ).title}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Email do membro</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="membro@email.com" className="input-premium" />
            </div>
            <p className="text-xs text-muted-foreground">O membro receberá um convite para participar da família.</p>
            <Button
              onClick={handleInvite}
              disabled={sending || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className="w-full btn-premium"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
