import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Zap, FileText, Image, Loader2, ArrowLeft, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { formatarMoeda } from "@/lib/utils";
import { gerarAnaliseFinanceira } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import BottomNav from "@/components/BottomNav";

const CORES_CATEGORIA: Record<string, string> = {
  "Alimentação": "#D4AF37",
  "Transporte": "#60A5FA",
  "Saúde": "#34D399",
  "Lazer": "#F87171",
  "Educação": "#A78BFA",
  "Moradia": "#FB923C",
  "Roupas": "#F472B6",
  "Dízimo/Oferta": "#FBBF24",
  "Outros": "#94A3B8",
};

interface ResultadoAnalise {
  estabelecimento: string;
  valor: number;
  data: string;
  categoria: string;
  descricao: string;
}

export default function IAConselho() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, calcularTotais } = useTransacoes();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [analisando, setAnalisando] = useState(false);
  const [resultadoAnalise, setResultadoAnalise] = useState<ResultadoAnalise | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [respostaIA, setRespostaIA] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [analiseMenusal, setAnaliseMensal] = useState("");
  const [gerandoMensal, setGerandoMensal] = useState(false);

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

  // Dados para gráfico
  const categorias: Record<string, number> = {};
  transacoes.filter(t => t.tipo === "despesa").forEach(t => {
    categorias[t.categoria] = (categorias[t.categoria] || 0) + Number(t.valor);
  });
  const dadosGrafico = Object.entries(categorias).map(([name, value]) => ({
    name, value, color: CORES_CATEGORIA[name] || "#94A3B8"
  }));

  const handleUploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setAnalisando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const path = safeStoragePath(session.user.id, file.type);
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from("documentos")
        .createSignedUrl(path, 3600);
      if (signError) throw signError;

      const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
          prompt: `Analise este documento financeiro e extraia:
1. Nome do estabelecimento
2. Valor total (apenas número)
3. Data da compra (formato YYYY-MM-DD)
4. Categoria sugerida (escolha uma: Alimentação, Transporte, Saúde, Educação, Lazer, Moradia, Outros)
5. Descrição curta

Responda APENAS em JSON válido:
{"estabelecimento": "nome", "valor": 0.00, "data": "YYYY-MM-DD", "categoria": "Categoria", "descricao": "descrição curta"}

URL do documento: ${signedData.signedUrl}`,
        },
      });

      if (error) throw error;

      const text = data?.text || data?.resultado || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const resultado = JSON.parse(jsonMatch[0]);
        setResultadoAnalise(resultado);
        toast({ title: "✅ Documento analisado!" });
      } else {
        toast({ title: "Não foi possível extrair dados", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setAnalisando(false);
    }
  };

  const handleLancarTransacao = async () => {
    if (!resultadoAnalise) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: prof } = await supabase
        .from("profiles").select("familia_id")
        .eq("id", session.user.id).maybeSingle();

      if (!prof?.familia_id) return;

      await supabase.from("transacoes").insert({
        familia_id: prof.familia_id,
        usuario_id: session.user.id,
        tipo: "despesa",
        valor: resultadoAnalise.valor,
        categoria: resultadoAnalise.categoria,
        descricao: resultadoAnalise.estabelecimento + " - " + resultadoAnalise.descricao,
        data_transacao: resultadoAnalise.data,
        recorrente: false,
        tags: ["ia-lancado"],
      });

      await supabase.rpc("add_gamification_points", {
        p_pontos: 20,
        p_tipo_evento: "upload_documento",
        p_descricao: "Lançou transação via IA",
      });

      toast({ title: "🎉 Lançado! +20 pontos por usar IA!" });
      setResultadoAnalise(null);
      setPreviewUrl(null);
      navigate("/dashboard");
    } catch {
      toast({ title: "Erro ao lançar", variant: "destructive" });
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
          <h1 className="text-lg font-bold text-foreground">⚡ Conselho IA</h1>
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

            {resultadoAnalise && (
              <div className="space-y-3 p-3 rounded-xl card-glass">
                <h3 className="text-sm font-bold text-primary">📋 Dados extraídos</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Estabelecimento:</span> {resultadoAnalise.estabelecimento}</p>
                  <p><span className="text-muted-foreground">Valor:</span> <span className="text-destructive font-bold">R$ {resultadoAnalise.valor?.toFixed(2)}</span></p>
                  <p><span className="text-muted-foreground">Data:</span> {resultadoAnalise.data}</p>
                  <p><span className="text-muted-foreground">Categoria:</span> {resultadoAnalise.categoria}</p>
                  <p><span className="text-muted-foreground">Descrição:</span> {resultadoAnalise.descricao}</p>
                </div>
                <button
                  onClick={handleLancarTransacao}
                  className="w-full py-3 rounded-xl font-bold"
                  style={{ background: "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)", color: "#000" }}
                >
                  🚀 Lançar no Sistema
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2: Conselho Financeiro */}
        <Card className="card-glass-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Conselho Financeiro
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
            <button
              onClick={handleConsultar}
              disabled={consultando || !pergunta.trim()}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{
                background: consultando ? "rgba(212,175,55,0.5)" : "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)",
                color: "#000",
                cursor: consultando ? "not-allowed" : "pointer",
              }}
            >
              {consultando ? <><Loader2 className="h-4 w-4 animate-spin" /> Consultando...</> : "⚡ Invocar Conselho"}
            </button>

            {respostaIA && (
              <div className="p-3 rounded-xl card-glass whitespace-pre-wrap text-sm text-foreground/90 max-h-[40vh] overflow-y-auto">
                {respostaIA}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 3: Análise Mensal */}
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
                <p className="text-sm font-bold" style={{ color: "#22c55e" }}>{formatarMoeda(totais.receitas)}</p>
              </div>
              <div className="p-2 rounded-lg card-glass">
                <p className="text-[10px] text-muted-foreground">Saídas</p>
                <p className="text-sm font-bold" style={{ color: "#ef4444" }}>{formatarMoeda(totais.despesas)}</p>
              </div>
              <div className="p-2 rounded-lg card-glass">
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className="text-sm font-bold" style={{ color: totais.saldo >= 0 ? "#D4AF37" : "#ef4444" }}>{formatarMoeda(totais.saldo)}</p>
              </div>
            </div>

            {dadosGrafico.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosGrafico} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {dadosGrafico.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <button
              onClick={handleAnaliseMensal}
              disabled={gerandoMensal}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{
                background: gerandoMensal ? "rgba(212,175,55,0.5)" : "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)",
                color: "#000",
              }}
            >
              {gerandoMensal ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : "📊 Gerar Análise Completa"}
            </button>

            {analiseMenusal && (
              <div className="p-3 rounded-xl card-glass whitespace-pre-wrap text-sm text-foreground/90 max-h-[40vh] overflow-y-auto">
                {analiseMenusal}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
