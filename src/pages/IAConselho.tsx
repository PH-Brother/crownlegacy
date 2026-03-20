import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Loader2, ArrowLeft, TrendingDown, ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIAS_DROPDOWN = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
  "Lazer", "Assinaturas", "Roupas", "Dízimo/Oferta", "Investimentos", "Outros",
];

const CORES_CATEGORIA: Record<string, string> = {
  "Alimentação": "#22c55e",
  "Transporte": "#3b82f6",
  "Saúde": "#f97316",
  "Educação": "#a855f7",
  "Lazer": "#ec4899",
  "Moradia": "#d4af37",
  "Assinaturas": "#06b6d4",
  "Roupas": "#F472B6",
  "Dízimo/Oferta": "#FBBF24",
  "Outros": "#94a3b8",
};

const ICONES_CATEGORIA: Record<string, string> = {
  "Alimentação": "🍔",
  "Transporte": "🚗",
  "Saúde": "💊",
  "Educação": "📚",
  "Lazer": "🎮",
  "Moradia": "🏠",
  "Assinaturas": "📱",
  "Roupas": "👕",
  "Dízimo/Oferta": "⛪",
  "Outros": "📦",
};

export default function IAConselho() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, calcularTotais } = useTransacoes();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = profile?.role === "pai" || profile?.role === "admin";

  // Members lookup for transaction author display
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});

  const [pergunta, setPergunta] = useState("");
  const [respostaIA, setRespostaIA] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [analiseMenusal, setAnaliseMensal] = useState("");
  const [gerandoMensal, setGerandoMensal] = useState(false);

  // Edit/delete transaction states
  const [deleteTransacaoId, setDeleteTransacaoId] = useState<string | null>(null);
  const [editTransacaoOpen, setEditTransacaoOpen] = useState(false);
  const [editTransacao, setEditTransacao] = useState<{
    id: string; descricao: string | null; valor: number; categoria: string; tipo: string; data_transacao: string;
  } | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (profile?.familia_id) {
      buscarTransacoes(profile.familia_id, mes, ano);
      // Load family members for author display
      supabase
        .from("profiles")
        .select("id, nome_completo")
        .eq("familia_id", profile.familia_id)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, string> = {};
            data.forEach((p) => { map[p.id] = p.nome_completo; });
            setMembersMap(map);
          }
        });
    }
  }, [profile?.familia_id, mes, ano, buscarTransacoes]);

  const totais = calcularTotais(transacoes);

  // Category data for horizontal bars
  const categorias: Record<string, number> = {};
  transacoes.filter(t => t.tipo === "despesa").forEach(t => {
    categorias[t.categoria] = (categorias[t.categoria] || 0) + Number(t.valor);
  });
  const totalDespesas = Object.values(categorias).reduce((s, v) => s + v, 0);
  const categoriasOrdenadas = Object.entries(categorias)
    .map(([nome, total]) => ({
      nome,
      total,
      percentual: totalDespesas > 0 ? Math.round((total / totalDespesas) * 100) : 0,
      icone: ICONES_CATEGORIA[nome] || "📦",
      cor: CORES_CATEGORIA[nome] || "#94a3b8",
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const handleConsultar = useCallback(async () => {
    if (!pergunta.trim()) return;
    setConsultando(true);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
          prompt: `Você é um conselheiro financeiro cristão. Responda com sabedoria bíblica.
Situação do usuário: Receitas R$${totais.receitas.toFixed(2)}, Despesas R$${totais.despesas.toFixed(2)}, Saldo R$${totais.saldo.toFixed(2)}.
Pergunta: ${pergunta.slice(0, 500)}

Responda incluindo: 1) Versículo bíblico relevante 2) Análise da situação 3) Plano de ação prático`,
        },
      });
      if (error) {
        console.error("Edge Function error:", error);
        toast({ title: "Não foi possível processar", description: "Tente novamente em instantes.", variant: "destructive" });
        return;
      }
      setRespostaIA(data?.text || data?.resultado || "Sem resposta");

      await supabase.rpc("add_gamification_points", {
        p_pontos: 15,
        p_tipo_evento: "conselho_ia",
        p_descricao: "Consultou conselho IA",
      });
      toast({ title: "⚡ +15 pontos por consultar a IA!" });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setConsultando(false);
    }
  }, [pergunta, totais, toast]);

  const handleAnaliseMensal = useCallback(async () => {
    setGerandoMensal(true);
    try {
      const resultado = await gerarAnaliseFinanceira({
        receitas: totais.receitas,
        despesas: totais.despesas,
        saldo: totais.saldo,
        categorias,
        mes: `${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1]} ${ano}`,
      });
      setAnaliseMensal(resultado);

      await supabase.rpc("add_gamification_points", {
        p_pontos: 15,
        p_tipo_evento: "analise_mensal",
        p_descricao: "Gerou análise mensal IA",
      });
      toast({ title: "⚡ +15 pontos!" });
    } catch {
      toast({ title: "Erro ao gerar análise", variant: "destructive" });
    } finally {
      setGerandoMensal(false);
    }
  }, [totais, categorias, mes, ano, toast]);

  const handleEditarTransacao = (t: any) => {
    if (!t) return;
    setEditTransacao(t);
    setEditValor(String(t.valor));
    setEditCategoria(t.categoria);
    setEditDescricao(t.descricao || "");
    setEditTransacaoOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!editTransacao || !user) return;
    if (!editValor || Number(editValor) <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    // Admin can edit any transaction; member can only edit own
    let query = supabase
      .from("transacoes")
      .update({ valor: Number(editValor), categoria: editCategoria, descricao: editDescricao.trim() || null })
      .eq("id", editTransacao.id);
    if (!isAdmin) {
      query = query.eq("usuario_id", user.id);
    }
    const { error } = await query;
    setEditSaving(false);
    if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
    toast({ title: "✅ Transação atualizada" });
    setEditTransacaoOpen(false);
    setEditTransacao(null);
    if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
  };

  const handleExcluirTransacao = async () => {
    if (!deleteTransacaoId) return;
    let query = supabase.from("transacoes").delete().eq("id", deleteTransacaoId);
    if (!isAdmin) {
      query = query.eq("usuario_id", user!.id);
    }
    const { error } = await query;
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); }
    else { toast({ title: "Transação excluída" }); if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano); }
    setDeleteTransacaoId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold" style={{ fontFamily: "'Lora', serif", color: "hsl(var(--primary))" }}>📖 Dicas de Sabedoria</h1>
        </div>

        {/* Botão Nova Transação */}
        <button
          onClick={() => navigate("/nova-transacao")}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 active:scale-95 transition-all duration-150 text-primary font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>

        {/* SEÇÃO 1: Conselho Financeiro */}
        <Card className="card-glass-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> 📖 Dicas de Sabedoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Descreva sua situação financeira</Label>
              <Textarea
                placeholder="Ex: Estou gastando muito com alimentação fora de casa..."
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                className="min-h-[80px] input-premium"
                disabled={consultando}
              />
            </div>
            <Button
              onClick={handleConsultar}
              disabled={consultando || !pergunta.trim()}
              className="w-full py-3 gradient-gold text-primary-foreground font-bold"
            >
              {consultando ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span>Consultando...</span>
                </div>
              ) : "📖 Pedir Sabedoria"}
            </Button>

            {respostaIA && (
              <div className="p-4 rounded-xl border border-primary/30 max-h-96 overflow-y-auto animate-in fade-in bg-muted/30">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown components={{
                    h3: ({ children }) => <h3 className="text-primary font-semibold text-base mt-4 mb-2 flex items-center gap-2">{children}</h3>,
                    strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
                    p: ({ children }) => <p className="text-foreground leading-relaxed mb-3">{children}</p>,
                    li: ({ children }) => <li className="text-foreground mb-2 flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{children}</span></li>,
                    ul: ({ children }) => <ul className="space-y-1 mb-3 list-none pl-0">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-1 mb-3 list-none pl-0">{children}</ol>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-3">{children}</blockquote>,
                  }}>{respostaIA}</ReactMarkdown>
                </div>
                <div className="flex justify-end mt-3">
                  <span className="text-xs text-primary font-medium">⚡ +15 pontos por usar IA!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2: Análise Mensal — with horizontal bars */}
        <Card className="card-glass-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" /> Análise Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Seletor de mês/ano */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (mes === 1) { setMes(12); setAno(a => a - 1); }
                  else setMes(m => m - 1);
                  setAnaliseMensal("");
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-muted"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1]}
                </p>
                <p className="text-xs text-muted-foreground">{ano}</p>
              </div>
              <button
                onClick={() => {
                  const n = new Date();
                  if (mes === n.getMonth() + 1 && ano === n.getFullYear()) return;
                  if (mes === 12) { setMes(1); setAno(a => a + 1); }
                  else setMes(m => m + 1);
                  setAnaliseMensal("");
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-muted disabled:opacity-30"
                style={{ border: "1px solid hsl(var(--border))" }}
                disabled={mes === new Date().getMonth() + 1 && ano === new Date().getFullYear()}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg card-glass">
                <p className="text-[10px] text-muted-foreground">Entradas</p>
                <p className="text-sm font-bold text-success">{formatarMoeda(totais.receitas)}</p>
              </div>
              <div className="p-2 rounded-lg card-glass">
                <p className="text-[10px] text-muted-foreground">Saídas</p>
                <p className="text-sm font-bold text-destructive">{formatarMoeda(totais.despesas)}</p>
              </div>
              <div className="p-2 rounded-lg card-glass">
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold ${totais.saldo >= 0 ? "text-primary" : "text-destructive"}`}>{formatarMoeda(totais.saldo)}</p>
              </div>
            </div>

            {/* Horizontal category bars */}
            {categoriasOrdenadas.length > 0 && (
              <div className="space-y-3">
                {categoriasOrdenadas.map((cat) => (
                  <div key={cat.nome} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground text-sm flex items-center gap-2">
                        <span className="text-base">{cat.icone}</span>
                        {cat.nome}
                      </span>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-foreground text-sm font-bold">
                          R$ {cat.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {cat.percentual}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${cat.percentual}%`, backgroundColor: cat.cor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de transações do mês com editar/excluir */}
            {transacoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Lançamentos do mês ({transacoes.length})
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {transacoes.map((t) => {
                    const isOwn = t.usuario_id === user?.id;
                    const canEdit = isAdmin || isOwn;
                    const authorName = t.usuario_id && membersMap[t.usuario_id] ? membersMap[t.usuario_id]?.split(" ")[0] : null;
                    return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.5)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-foreground text-sm font-medium truncate">{t.descricao || t.categoria}</p>
                          {!isOwn && authorName && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0 font-medium">{authorName}</span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t.categoria} · {new Date(t.data_transacao + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className={`font-bold text-sm font-mono shrink-0 ${t.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                        {t.tipo === "receita" ? "+" : "-"}R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEditarTransacao(t)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteTransacaoId(t.id)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                        </button>
                      </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleAnaliseMensal}
              disabled={gerandoMensal}
              className="w-full py-3 gradient-gold text-primary-foreground font-bold"
            >
              {gerandoMensal ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span>Gerando...</span>
                </div>
              ) : "📊 Gerar Análise Completa"}
            </Button>

            {analiseMenusal && (
              <div className="p-4 rounded-xl border border-primary/30 max-h-96 overflow-y-auto animate-in fade-in bg-muted/30">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown components={{
                    h3: ({ children }) => <h3 className="text-primary font-semibold text-base mt-4 mb-2 flex items-center gap-2">{children}</h3>,
                    strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
                    p: ({ children }) => <p className="text-foreground leading-relaxed mb-3">{children}</p>,
                    li: ({ children }) => <li className="text-foreground mb-2 flex items-start gap-2"><span className="text-primary mt-1">•</span><span>{children}</span></li>,
                    ul: ({ children }) => <ul className="space-y-1 mb-3 list-none pl-0">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-1 mb-3 list-none pl-0">{children}</ol>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-3">{children}</blockquote>,
                  }}>{analiseMenusal}</ReactMarkdown>
                </div>
                <div className="flex justify-end mt-3">
                  <span className="text-xs text-primary font-medium">⚡ +15 pontos!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de edição */}
      <Dialog open={editTransacaoOpen} onOpenChange={(o) => !o && setEditTransacaoOpen(false)}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={editValor} onChange={(e) => setEditValor(e.target.value)} min={0.01} step={0.01} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-input text-foreground outline-none text-sm">
                {CATEGORIAS_DROPDOWN.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Descrição opcional" className="min-h-[44px]" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditTransacaoOpen(false)}>Cancelar</Button>
            <Button className="gradient-gold text-primary-foreground font-bold" onClick={handleSalvarEdicao} disabled={editSaving}>
              {editSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <AlertDialog open={!!deleteTransacaoId} onOpenChange={(o) => !o && setDeleteTransacaoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluirTransacao} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
