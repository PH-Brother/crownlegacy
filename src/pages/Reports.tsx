import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useGamificacao } from "@/hooks/useGamificacao";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import BottomNav from "@/components/BottomNav";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CORES = ["hsl(46,76%,52%)","hsl(142,71%,45%)","hsl(0,84%,60%)","hsl(200,70%,50%)","hsl(280,60%,55%)","hsl(30,80%,55%)","hsl(160,50%,45%)","hsl(320,60%,50%)","hsl(60,70%,50%)"];

export default function Reports() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, calcularTotais } = useTransacoes();
  const { adicionarPontos } = useGamificacao();
  const { toast } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [analise, setAnalise] = useState("");
  const [analisando, setAnalisando] = useState(false);

  useEffect(() => { if (user) buscarPerfil(user.id); }, [user, buscarPerfil]);
  useEffect(() => {
    if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
  }, [profile?.familia_id, mes, ano, buscarTransacoes]);

  const totais = calcularTotais(transacoes);

  const catMap: Record<string, number> = {};
  transacoes.filter(t => t.tipo === "despesa").forEach(t => {
    catMap[t.categoria] = (catMap[t.categoria] || 0) + Number(t.valor);
  });
  const pieData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const barData = [
    { name: "Receitas", value: totais.receitas, fill: "hsl(142,71%,45%)" },
    { name: "Despesas", value: totais.despesas, fill: "hsl(0,84%,60%)" },
  ];

  const mudarMes = (dir: number) => {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  };

  const handleIA = useCallback(async () => {
    if (!user) return;
    setAnalisando(true);
    try {
      const r = await gerarAnaliseFinanceira({
        receitas: totais.receitas, despesas: totais.despesas, saldo: totais.saldo,
        categorias: catMap, mes: `${MESES[mes-1]} ${ano}`,
      });
      setAnalise(r);
      await adicionarPontos(user.id, 15, "analise_ia", "Analisou relatório com IA");
      toast({ title: "⚡ +15 pontos!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na análise", variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  }, [user, totais, catMap, mes, ano, adicionarPontos, toast]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Relatórios</h1>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="font-semibold">{MESES[mes-1]} {ano}</span>
          <Button variant="ghost" size="icon" onClick={() => mudarMes(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Comparativo */}
        <Card className="card-glass">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receitas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(0,0%,60%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(0,0%,60%)", fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatarMoeda(v)} contentStyle={{ background: "hsl(0,0%,7%)", border: "1px solid hsl(46,30%,18%)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico pizza */}
        {pieData.length > 0 && (
          <Card className="card-glass">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} contentStyle={{ background: "hsl(0,0%,7%)", border: "1px solid hsl(46,30%,18%)" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top categorias */}
        {pieData.length > 0 && (
          <Card className="card-glass">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Categorias</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pieData.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: CORES[i % CORES.length] }} />
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-sm font-medium">{formatarMoeda(item.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* IA */}
        <Sheet>
          <SheetTrigger asChild>
            <Button className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold" disabled={analisando} onClick={handleIA}>
              <Bot className="h-5 w-5 mr-2" /> {analisando ? "Analisando..." : "🤖 Analisar com IA"}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-primary/20">
            <SheetHeader><SheetTitle className="text-primary">Análise IA</SheetTitle></SheetHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm max-h-[60vh] overflow-y-auto">{analise || "Gerando..."}</div>
          </SheetContent>
        </Sheet>
      </div>
      <BottomNav />
    </div>
  );
}
