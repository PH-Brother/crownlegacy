import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useGamificacao } from "@/hooks/useGamificacao";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

const EMOJIS_CAT: Record<string, string> = {
  "Alimentação": "🍽️", "Transporte": "🚗", "Saúde": "❤️", "Educação": "📚",
  "Lazer": "🎉", "Moradia": "🏠", "Salário": "💰", "Freelance": "💻",
  "Investimentos": "📈", "Dízimo/Oferta": "🙏", "Roupas": "👕",
  "Presente": "🎁", "Outros": "📦",
};

export default function NovaTransacao() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { criarTransacao } = useTransacoes();
  const { adicionarPontos } = useGamificacao();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const handleSalvar = async () => {
    const valorNum = parseFloat(valor.replace(/\./g, "").replace(",", "."));

    if (!valor || isNaN(valorNum) || valorNum <= 0) {
      toast({ title: "Digite um valor válido", variant: "destructive" });
      return;
    }
    if (!categoria) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }
    if (!user || !profile?.familia_id) {
      toast({ title: "Sessão não encontrada", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setSalvando(true);
    try {
      await criarTransacao({
        familia_id: profile.familia_id,
        usuario_id: user.id,
        tipo,
        valor: valorNum,
        categoria,
        descricao: descricao || undefined,
        data_transacao: data,
      });

      await adicionarPontos(user.id, 10, "nova_transacao", "Cadastrou transação");

      if (navigator.vibrate) navigator.vibrate(200);

      toast({ title: "✅ Salvo! +10 pontos" });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Nova Transação</h1>
        </div>

        {/* Toggle tipo */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={tipo === "receita" ? "default" : "outline"}
            className={tipo === "receita" ? "gradient-green text-foreground font-bold" : ""}
            onClick={() => { setTipo("receita"); setCategoria(""); }}
          >
            💰 Receita
          </Button>
          <Button
            variant={tipo === "despesa" ? "default" : "outline"}
            className={tipo === "despesa" ? "gradient-red text-foreground font-bold" : ""}
            onClick={() => { setTipo("despesa"); setCategoria(""); }}
          >
            💸 Despesa
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="min-h-[48px] text-2xl font-bold input-premium"
            step="0.01"
            min="0"
            disabled={salvando}
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria} disabled={salvando}>
            <SelectTrigger className="min-h-[48px] input-premium">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>{EMOJIS_CAT[c] || "📦"} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Descrição (opcional)</Label>
          <Input
            placeholder="Ex: Almoço com a família"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-[48px] input-premium"
            disabled={salvando}
          />
        </div>

        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="min-h-[48px] input-premium"
            disabled={salvando}
          />
        </div>

        <Button
          onClick={handleSalvar}
          className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
          disabled={salvando}
        >
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : "✅ Salvar Transação"}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
