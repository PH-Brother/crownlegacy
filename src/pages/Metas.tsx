import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { formatarMoeda } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface Meta {
  id: string;
  titulo: string;
  descricao: string | null;
  valor_alvo: number;
  valor_atual: number | null;
  prazo_final: string | null;
  status: string | null;
  categoria: string | null;
  created_at: string | null;
}

const CATEGORIAS_META = ["Emergência", "Viagem", "Educação", "Casa", "Carro", "Investimento", "Dízimo", "Outros"];

export default function Metas() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aporteDialogId, setAporteDialogId] = useState<string | null>(null);
  const [aporteValor, setAporteValor] = useState("");

  // New meta form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  const buscarMetas = useCallback(async () => {
    if (!profile?.familia_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select("*")
        .eq("familia_id", profile.familia_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMetas((data || []) as Meta[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.familia_id]);

  useEffect(() => {
    buscarMetas();
  }, [buscarMetas]);

  const criarMeta = async () => {
    if (!titulo || !valorAlvo) {
      toast({ title: "Preencha título e valor alvo", variant: "destructive" });
      return;
    }
    setCriando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !profile?.familia_id) return;

      const { error } = await supabase.from("metas_financeiras").insert({
        familia_id: profile.familia_id,
        criador_id: session.user.id,
        titulo,
        descricao: descricao || null,
        valor_alvo: parseFloat(valorAlvo),
        valor_atual: 0,
        prazo_final: prazo || null,
        status: "ativa",
        categoria: categoria || null,
      });
      if (error) throw error;

      await supabase.rpc("add_gamification_points", {
        p_pontos: 15,
        p_tipo_evento: "meta_criada",
        p_descricao: "Criou meta financeira",
      });

      toast({ title: "🎯 Meta criada! +15 pontos" });
      setDialogOpen(false);
      setTitulo(""); setDescricao(""); setValorAlvo(""); setPrazo(""); setCategoria("");
      buscarMetas();
    } catch (err: unknown) {
      console.error(err);
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } finally {
      setCriando(false);
    }
  };

  const registrarAporte = async () => {
    if (!aporteDialogId || !aporteValor) return;
    try {
      const meta = metas.find(m => m.id === aporteDialogId);
      if (!meta) return;
      const novoValor = (Number(meta.valor_atual) || 0) + parseFloat(aporteValor);

      const { error } = await supabase.from("metas_financeiras")
        .update({
          valor_atual: novoValor,
          status: novoValor >= Number(meta.valor_alvo) ? "concluida" : "ativa",
        })
        .eq("id", aporteDialogId);
      if (error) throw error;

      toast({ title: "💰 Aporte registrado!" });
      setAporteDialogId(null);
      setAporteValor("");
      buscarMetas();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao registrar", variant: "destructive" });
    }
  };

  const diasRestantes = (prazo: string | null) => {
    if (!prazo) return null;
    const diff = Math.ceil((new Date(prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">🎯 Metas Financeiras</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nova Meta</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reserva de emergência" className="input-premium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da meta" className="input-premium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Alvo (R$)</Label>
                  <Input type="number" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)} placeholder="10000" className="input-premium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo</Label>
                  <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className="input-premium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="input-premium"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_META.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={criarMeta}
                  disabled={criando}
                  className="w-full py-3 rounded-xl font-bold"
                  style={{ background: "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)", color: "#000" }}
                >
                  {criando ? "⏳ Criando..." : "🎯 Criar Meta"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : metas.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-3 text-primary/40" />
            <p className="text-muted-foreground">Nenhuma meta criada</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira meta financeira!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {metas.map(meta => {
              const percent = Math.min(100, (Number(meta.valor_atual || 0) / Number(meta.valor_alvo)) * 100);
              const dias = diasRestantes(meta.prazo_final);
              const concluida = meta.status === "concluida";

              return (
                <Card key={meta.id} className={concluida ? "card-glass border-success/30" : "card-glass-gold"}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-foreground text-sm">{meta.titulo}</p>
                        {meta.categoria && <p className="text-xs text-muted-foreground">{meta.categoria}</p>}
                      </div>
                      {concluida ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>✅ Concluída</span>
                      ) : dias !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${dias < 3 ? "bg-destructive/20 text-destructive" : dias < 7 ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"}`}>
                          {dias > 0 ? `${dias} dias` : "Vencida"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{formatarMoeda(Number(meta.valor_atual || 0))}</span>
                        <span className="text-primary font-bold">{percent.toFixed(0)}%</span>
                        <span className="text-muted-foreground">{formatarMoeda(Number(meta.valor_alvo))}</span>
                      </div>
                      <Progress value={percent} className="h-2 [&>div]:bg-primary" />
                    </div>

                    {!concluida && (
                      <button
                        onClick={() => setAporteDialogId(meta.id)}
                        className="w-full py-2 rounded-lg text-sm font-bold card-glass hover:border-primary/40 transition-colors text-primary"
                      >
                        💰 Registrar Aporte
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Aporte Dialog */}
        <Dialog open={!!aporteDialogId} onOpenChange={(o) => !o && setAporteDialogId(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Registrar Aporte</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor do aporte (R$)</Label>
                <Input type="number" value={aporteValor} onChange={e => setAporteValor(e.target.value)} placeholder="500" className="input-premium" />
              </div>
              <button
                onClick={registrarAporte}
                className="w-full py-3 rounded-xl font-bold"
                style={{ background: "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)", color: "#000" }}
              >
                💰 Confirmar Aporte
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
}
