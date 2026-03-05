import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Zap, FileText, Image, Loader2, ArrowLeft, TrendingDown, Rocket } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import { safeStoragePath } from "@/lib/sanitize";

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

interface TransacaoExtraida {
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
}

interface ResultadoAnaliseJSON {
  tipo_documento: string;
  emissor: string;
  titular: string;
  valor_total: number;
  vencimento: string;
  periodo: string;
  transacoes: TransacaoExtraida[];
  resumo_categorias: { categoria: string; total: number; percentual: number }[];
  insights: string[];
  alerta: string;
  versiculo: string;
  versiculo_ref: string;
}

export default function IAConselho() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, calcularTotais } = useTransacoes();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [analisando, setAnalisando] = useState(false);
  const [resultadoAnalise, setResultadoAnalise] = useState<ResultadoAnaliseJSON | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [respostaIA, setRespostaIA] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [analiseMenusal, setAnaliseMensal] = useState("");
  const [gerandoMensal, setGerandoMensal] = useState(false);
  const [lancando, setLancando] = useState(false);

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
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

  const handleUploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setAnalisando(true);
    setResultadoAnalise(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const path = safeStoragePath(session.user.id, file.type);
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
      if (uploadError) throw uploadError;

      // Download for base64
      const { data: urlData } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
      if (!urlData?.signedUrl) throw new Error("Arquivo não encontrado");

      const response = await fetch(urlData.signedUrl);
      const blob = await response.blob();
      const base64Full = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Data = base64Full.split(",")[1];

      const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
          base64Data,
          mimeType: blob.type || file.type,
          fileName: file.name,
        },
      });

      if (error) throw error;

      const text = data?.resultado || data?.text || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ResultadoAnaliseJSON;
          setResultadoAnalise(parsed);
          toast({ title: `✅ ${parsed.transacoes?.length || 0} transações extraídas!` });
        } else {
          throw new Error("JSON não encontrado");
        }
      } catch {
        toast({ title: "Não foi possível extrair dados estruturados", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  };

  const handleLancarTodas = async () => {
    if (!resultadoAnalise?.transacoes?.length) return;
    setLancando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: prof } = await supabase
        .from("profiles").select("familia_id")
        .eq("id", session.user.id).maybeSingle();

      if (!prof?.familia_id) {
        toast({ title: "Complete o onboarding primeiro", variant: "destructive" });
        return;
      }

      const transacoesParaInserir = resultadoAnalise.transacoes.map(t => ({
        usuario_id: session.user.id,
        familia_id: prof.familia_id,
        tipo: "despesa" as const,
        descricao: t.descricao,
        valor: Math.abs(t.valor),
        categoria: t.categoria || "Outros",
        data_transacao: (() => {
          if (!t.data) return new Date().toISOString().split("T")[0];
          const partes = t.data.split("/");
          if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
          return new Date().toISOString().split("T")[0];
        })(),
        recorrente: false,
        tags: ["ia-lancado"] as string[],
      }));

      const { error } = await supabase.from("transacoes").insert(transacoesParaInserir);
      if (error) throw error;

      await supabase.rpc("add_gamification_points", {
        p_pontos: 20,
        p_tipo_evento: "upload_documento",
        p_descricao: `Lançou ${transacoesParaInserir.length} transações via IA`,
      });

      toast({ title: `🎉 ${transacoesParaInserir.length} transações lançadas! +20 pontos` });
      setResultadoAnalise(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao lançar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLancando(false);
    }
  };

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
      if (error) throw error;
      setRespostaIA(data?.text || data?.resultado || "Sem resposta");

      await supabase.rpc("add_gamification_points", {
        p_pontos: 15,
        p_tipo_evento: "conselho_ia",
        p_descricao: "Consultou conselho IA",
      });
      toast({ title: "⚡ +15 pontos por consultar a IA!" });
    } catch {
      toast({ title: "Erro ao consultar IA", variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold" style={{ fontFamily: "'Lora', serif", color: "hsl(var(--primary))" }}>📖 Dicas de Sabedoria</h1>
        </div>

        {/* SEÇÃO 1: Upload de Documentos */}
        <Card className="card-glass-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Análise de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Envie um comprovante, cupom fiscal ou fatura e a IA extrai os dados automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-1 py-4 rounded-xl card-glass hover:border-primary/40 transition-colors">
                  <Image className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Imagem</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadDocumento} disabled={analisando} />
              </label>
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-1 py-4 rounded-xl card-glass hover:border-primary/40 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">PDF</span>
                </div>
                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadDocumento} disabled={analisando} />
              </label>
            </div>

            {analisando && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analisando documento...</span>
              </div>
            )}

            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-full rounded-lg max-h-48 object-contain" />
            )}

            {/* Structured result display */}
            {resultadoAnalise && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Header */}
                <div className="rounded-xl p-4 border border-primary/20 bg-muted/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-primary font-bold text-base">{resultadoAnalise.emissor || "Documento"}</p>
                      <p className="text-muted-foreground text-xs">
                        {resultadoAnalise.tipo_documento?.replace(/_/g, " ")}
                        {resultadoAnalise.periodo && ` • ${resultadoAnalise.periodo}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground font-bold text-xl">
                        R$ {resultadoAnalise.valor_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {resultadoAnalise.vencimento && (
                        <p className="text-destructive text-xs">Vence: {resultadoAnalise.vencimento}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transactions list */}
                {resultadoAnalise.transacoes?.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-foreground text-sm font-semibold">
                        {resultadoAnalise.transacoes.length} transações encontradas
                      </p>
                      <Button
                        size="sm"
                        onClick={handleLancarTodas}
                        disabled={lancando}
                        className="gradient-gold text-primary-foreground font-bold text-xs h-8 px-3"
                      >
                        {lancando ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Rocket className="h-3 w-3 mr-1" />
                        )}
                        Lançar todas ({resultadoAnalise.transacoes.length})
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {resultadoAnalise.transacoes.map((t, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm font-medium truncate">{t.descricao}</p>
                            <p className="text-muted-foreground text-xs">
                              {t.data} • {t.categoria}
                            </p>
                          </div>
                          <p className="text-destructive font-bold text-sm ml-2 shrink-0">
                            R$ {t.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {resultadoAnalise.insights?.length > 0 && (
                  <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <p className="text-primary text-xs font-semibold mb-2">💡 Insights</p>
                    {resultadoAnalise.insights.map((ins, i) => (
                      <p key={i} className="text-foreground text-xs mb-1 flex gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>{ins}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Versículo */}
                {resultadoAnalise.versiculo && (
                  <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <p className="text-primary text-xs italic" style={{ fontFamily: "'Lora', serif" }}>
                      🙏 "{resultadoAnalise.versiculo}"
                    </p>
                    {resultadoAnalise.versiculo_ref && (
                      <p className="text-primary/60 text-[10px] mt-1">— {resultadoAnalise.versiculo_ref}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2: Conselho Financeiro */}
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

        {/* SEÇÃO 3: Análise Mensal — with horizontal bars */}
        <Card className="card-glass-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" /> Análise Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
    </div>
  );
}
