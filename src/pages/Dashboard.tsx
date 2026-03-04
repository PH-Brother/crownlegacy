import { useState, useCallback, useEffect } from "react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFamiliaId } from "@/hooks/useFamiliaId";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useGamificacao } from "@/hooks/useGamificacao";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import BottomNav from "@/components/BottomNav";
import PaywallBanner from "@/components/PaywallBanner";
import GamificacaoBar from "@/components/GamificacaoBar";
import ReflexaoDiaria from "@/components/ReflexaoDiaria";
import TransacaoCard from "@/components/TransacaoCard";
import CategoryBars from "@/components/dashboard/CategoryBars";
import QuickTransactionModal from "@/components/dashboard/QuickTransactionModal";
import DocumentUpload from "@/components/dashboard/DocumentUpload";
import type { Transacao } from "@/hooks/useTransacoes";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function calcularDiasTrial(dataFimTrial: string | null): number | null {
  if (!dataFimTrial) return null;
  const diff = new Date(dataFimTrial).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function GoldenSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl animate-pulse ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.15))",
        border: "1px solid rgba(212,175,55,0.12)",
      }}
    />
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { adicionarPontos } = useGamificacao();
  const { familiaId, isLoading: loadingFamilia } = useFamiliaId();
  const navigate = useNavigate();
  const { toast } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [analiseIA, setAnaliseIA] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickType, setQuickType] = useState<"receita" | "despesa" | null>(null);

  const {
    receitas, despesas, saldo, transacoes, metas, pontos, nivel,
    isLoading: loadingData, error, refetch,
  } = useDashboardData(familiaId, user?.id ?? null, mes, ano);

  const loading = loadingFamilia || loadingData;
  const primeiroNome = profile?.nome_completo?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  const [familiaInfo, setFamiliaInfo] = useState<{ plano: string | null; data_fim_trial: string | null; nome: string } | null>(null);
  useEffect(() => {
    if (!familiaId) return;
    const fetchFam = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("familias").select("plano, data_fim_trial, nome").eq("id", familiaId).maybeSingle();
      if (data) setFamiliaInfo(data);
    };
    fetchFam();
  }, [familiaId]);

  // Category data for bars
  const categoriasMap: Record<string, number> = {};
  transacoes.filter(t => t.tipo === "despesa").forEach(t => {
    categoriasMap[t.categoria] = (categoriasMap[t.categoria] || 0) + Number(t.valor);
  });

  const trialDias = familiaInfo?.plano === "trial" ? calcularDiasTrial(familiaInfo.data_fim_trial) : null;

  const handleIA = useCallback(async () => {
    if (!user || !profile) return;
    setAnalisando(true);
    try {
      const resultado = await gerarAnaliseFinanceira({
        receitas, despesas, saldo,
        categorias: categoriasMap, mes: `${MESES[mes - 1]} ${ano}`,
      });
      setAnaliseIA(resultado);
      await adicionarPontos(user.id, 15, "analise_ia", "Consultou IA financeira");
      toast({ title: "⚡ +15 pontos por usar IA!" });
    } catch {
      toast({ title: "Erro ao gerar análise", variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  }, [user, profile, receitas, despesas, saldo, mes, ano, adicionarPontos, toast, categoriasMap]);

  const mudarMes = (dir: number) => {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("transacoes").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "🗑️ Transação excluída" });
      refetch();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEditar = (t: Transacao) => {
    navigate(`/nova-transacao?edit=${t.id}`);
  };

  const ultimas5 = transacoes.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PaywallBanner />
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/perfil")} className="h-11 w-11 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : primeiroNome[0]?.toUpperCase()}
          </button>
          <div className="flex-1">
            <p className="font-display font-semibold text-foreground text-sm">{getSaudacao()}, {primeiroNome}!</p>
            <p className="text-xs text-muted-foreground">{familiaInfo?.nome || ""}</p>
          </div>
          {familiaInfo && (
            <div className="px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide"
              style={{ border: "1px solid rgba(212,175,55,0.3)", color: familiaInfo.plano === "trial" ? "#F4E17A" : "#D4AF37", background: "rgba(212,175,55,0.08)" }}>
              {familiaInfo.plano === "trial" && trialDias !== null ? `TRIAL · ${trialDias}d` : "PREMIUM"}
            </div>
          )}
          <img src={logo} alt="Legacy Kingdom" className="w-10 h-10 rounded-lg drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
        </div>

        <GamificacaoBar pontos={pontos} nivel={nivel} />

        {/* Trial Warning */}
        {familiaInfo?.plano === "trial" && trialDias !== null && trialDias < 7 && (
          <Card className={`${trialDias < 3 ? "border-destructive/50 bg-destructive/10" : "border-yellow-500/30 bg-yellow-500/10"}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${trialDias < 3 ? "text-destructive" : "text-yellow-400"}`} />
              <div className="flex-1">
                <p className={`text-xs font-semibold ${trialDias < 3 ? "text-destructive" : "text-yellow-400"}`}>
                  {trialDias === 0 ? "Trial expirado!" : `Trial expira em ${trialDias} dia${trialDias > 1 ? "s" : ""}`}
                </p>
                <p className="text-[10px] text-muted-foreground">Assine para continuar usando</p>
              </div>
              <Button size="sm" className="gradient-gold text-primary-foreground text-xs h-7" onClick={() => navigate("/assinatura")}>Assinar</Button>
            </CardContent>
          </Card>
        )}

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="font-display font-semibold text-foreground">{MESES[mes - 1]} {ano}</span>
          <Button variant="ghost" size="icon" onClick={() => mudarMes(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Totals */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <GoldenSkeleton key={i} className="h-20" />)}
          </div>
        ) : error ? (
          <Card className="card-premium">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-sm text-destructive">Erro ao carregar dados</p>
              <Button size="sm" variant="outline" onClick={refetch} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Card className="card-premium">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
                <p className="text-[10px] text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-success tracking-tight">{formatarMoeda(receitas)}</p>
              </CardContent>
            </Card>
            <Card className="card-premium">
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
                <p className="text-[10px] text-muted-foreground">Saídas</p>
                <p className="text-sm font-bold text-destructive tracking-tight">{formatarMoeda(despesas)}</p>
              </CardContent>
            </Card>
            <Card className="card-premium">
              <CardContent className="p-3 text-center">
                <span className="text-sm mb-1 block">{saldo >= 0 ? "💰" : "⚠️"}</span>
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold tracking-tight ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatarMoeda(saldo)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Action Buttons */}
        {!loading && !error && familiaId && user && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setQuickType("receita")}
              className="min-h-[48px] text-sm font-bold rounded-xl"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", boxShadow: "0 4px 16px rgba(34,197,94,0.25)" }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova Receita
            </Button>
            <Button
              onClick={() => setQuickType("despesa")}
              className="min-h-[48px] text-sm font-bold rounded-xl"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", boxShadow: "0 4px 16px rgba(239,68,68,0.25)" }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova Despesa
            </Button>
          </div>
        )}

        {/* Quick Transaction Modal */}
        {quickType && familiaId && user && (
          <QuickTransactionModal
            open={!!quickType}
            onOpenChange={(o) => { if (!o) setQuickType(null); }}
            tipo={quickType}
            familiaId={familiaId}
            userId={user.id}
            onSuccess={refetch}
          />
        )}

        {/* Category Bars (replaces pie chart) */}
        {!loading && Object.keys(categoriasMap).length > 0 && (
          <CategoryBars categoriasMap={categoriasMap} />
        )}

        {/* Document Upload */}
        {!loading && familiaId && user && (
          <DocumentUpload userId={user.id} familiaId={familiaId} />
        )}

        <ReflexaoDiaria />

        {/* IA */}
        <Sheet>
          <SheetTrigger asChild>
            <Button className="w-full min-h-[48px] btn-premium font-bold" disabled={analisando} onClick={handleIA}>
              <Zap className="h-5 w-5 mr-2" />
              {analisando ? "Analisando..." : "⚡ Invocar Conselho IA"}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-primary/20">
            <SheetHeader><SheetTitle className="text-primary font-display">🤖 Conselho da IA</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-foreground/90 max-h-[60vh] overflow-y-auto">
              {analiseIA || "Gerando análise..."}
            </div>
          </SheetContent>
        </Sheet>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
            <Button variant="link" className="text-primary text-xs p-0 h-auto" onClick={() => navigate("/transacoes")}>Ver todas</Button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <GoldenSkeleton key={i} className="h-16" />)}</div>
          ) : ultimas5.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">📊</span>
              <p className="text-sm text-muted-foreground">Nenhuma transação neste mês</p>
              <Button variant="link" className="text-primary mt-1" onClick={() => navigate("/nova-transacao")}>Adicionar primeira transação</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimas5.map((t) => (
                <TransacaoCard key={t.id} transacao={t} onEdit={handleEditar} onDelete={(id) => setDeleteId(id)} />
              ))}
            </div>
          )}
        </div>

        {/* Delete dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <BottomNav />
    </div>
  );
}
