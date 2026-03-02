import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useGamificacao } from "@/hooks/useGamificacao";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Activity, Plus, Loader2 } from "lucide-react";

export default function FinancialHealth() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, calcularTotais } = useTransacoes();
  const { adicionarPontos } = useGamificacao();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [analises, setAnalises] = useState<Array<{ id: string; tipo_analise: string; resultado: unknown; created_at: string | null }>>([]);
  const [gerando, setGerando] = useState(false);

  const now = new Date();
  const totais = calcularTotais(transacoes);
  const score = Math.min(100, Math.max(0, totais.saldo > 0 ? 50 + Math.min(50, (totais.saldo / (totais.receitas || 1)) * 100) : Math.max(0, 50 + (totais.saldo / (totais.despesas || 1)) * 50)));

  useEffect(() => { if (user) buscarPerfil(user.id); }, [user, buscarPerfil]);
  useEffect(() => {
    if (profile?.familia_id) {
      buscarTransacoes(profile.familia_id, now.getMonth() + 1, now.getFullYear());
      supabase.from("ia_analises").select("*").eq("familia_id", profile.familia_id).order("created_at", { ascending: false }).limit(10)
        .then(({ data }) => { if (data) setAnalises(data); });
    }
  }, [profile?.familia_id]);

  const gerarNova = useCallback(async () => {
    if (!user || !profile?.familia_id) return;
    setGerando(true);
    try {
      const catMap: Record<string, number> = {};
      transacoes.filter(t => t.tipo === "despesa").forEach(t => { catMap[t.categoria] = (catMap[t.categoria] || 0) + Number(t.valor); });

      const resultado = await gerarAnaliseFinanceira({
        receitas: totais.receitas, despesas: totais.despesas, saldo: totais.saldo,
        categorias: catMap, mes: `${now.getMonth() + 1}/${now.getFullYear()}`,
      });

      await supabase.from("ia_analises").insert({
        familia_id: profile.familia_id,
        tipo_analise: "saude_financeira",
        resultado: { texto: resultado, score: Math.round(score) } as unknown as import("@/integrations/supabase/types").Json,
      });

      await adicionarPontos(user.id, 15, "analise_saude", "Análise de saúde financeira");
      toast({ title: "✅ Análise gerada! +15 pontos" });

      const { data } = await supabase.from("ia_analises").select("*").eq("familia_id", profile.familia_id).order("created_at", { ascending: false }).limit(10);
      if (data) setAnalises(data);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar", variant: "destructive" });
    } finally {
      setGerando(false);
    }
  }, [user, profile, transacoes, totais, score, adicionarPontos, toast]);

  const scoreColor = score >= 70 ? "text-success" : score >= 40 ? "text-primary" : "text-destructive";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Saúde Financeira
          </h1>
        </div>

        {/* Score gauge */}
        <Card className="card-glass-gold">
          <CardContent className="p-6 text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg viewBox="0 0 100 60" className="w-48 h-28">
                <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
                <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${score * 1.26} 126`} className="transition-all duration-1000" />
              </svg>
              <span className={`absolute bottom-0 text-3xl font-bold ${scoreColor}`}>{Math.round(score)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Score de Saúde Financeira</p>
          </CardContent>
        </Card>

        <Button onClick={gerarNova} disabled={gerando} className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold">
          {gerando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
          {gerando ? "Gerando..." : "Invocar Conselho Financeiro"}
        </Button>

        {/* Histórico */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Histórico de Análises</h2>
          {analises.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma análise ainda</p>
          ) : (
            analises.map((a) => (
              <Card key={a.id} className="card-glass">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-primary font-medium">{a.tipo_analise}</span>
                    <span className="text-xs text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : ""}</span>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-3">
                    {typeof a.resultado === "object" && a.resultado !== null ? (a.resultado as Record<string, string>).texto?.slice(0, 150) || JSON.stringify(a.resultado).slice(0, 150) : String(a.resultado).slice(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
