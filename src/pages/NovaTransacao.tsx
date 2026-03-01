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
    if (!valor || !categoria || !user || !profile?.familia_id) {
      toast({ title: "Preencha valor e categoria", variant: "destructive" });
      return;
    }

    setSalvando(true);
    const toastId = toast({ title: "💾 Salvando..." });

    try {
      await criarTransacao({
        familia_id: profile.familia_id,
        usuario_id: user.id,
        tipo,
        valor: parseFloat(valor),
        categoria,
        descricao: descricao || undefined,
        data_transacao: data,
      });

      await adicionarPontos(user.id, 10, "nova_transacao", "Cadastrou transação");

      if (navigator.vibrate) navigator.vibrate(200);

      toast({ title: "✅ Salvo! +10 pontos" });
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Erro ao salvar:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
            className={tipo === "receita" ? "bg-success hover:bg-success/90 text-primary-foreground" : ""}
            onClick={() => { setTipo("receita"); setCategoria(""); }}
          >
            Receita
          </Button>
          <Button
            variant={tipo === "despesa" ? "default" : "outline"}
            className={tipo === "despesa" ? "bg-destructive hover:bg-destructive/90" : ""}
            onClick={() => { setTipo("despesa"); setCategoria(""); }}
          >
            Despesa
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
            className="min-h-[48px] text-2xl font-bold"
            step="0.01"
            min="0"
            disabled={salvando}
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria} disabled={salvando}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
            className="min-h-[48px]"
            disabled={salvando}
          />
        </div>

        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="min-h-[48px]"
            disabled={salvando}
          />
        </div>

        <Button
          onClick={handleSalvar}
          className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
          disabled={salvando || !valor || !categoria}
        >
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Transação"}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
