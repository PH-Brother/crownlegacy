import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

const EMOJIS_CAT: Record<string, string> = {
  "Alimentação": "🍽️", "Transporte": "🚗", "Saúde": "❤️", "Educação": "📚",
  "Lazer": "🎉", "Moradia": "🏠", "Salário": "💰", "Freelance": "💻",
  "Investimentos": "📈", "Dízimo/Oferta": "🙏", "Roupas": "👕",
  "Presente": "🎁", "Outros": "📦",
};

export default function NovaTransacao() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tipo, setTipo] = useState<"receita" | "despesa" | "">("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : tipo === "despesa" ? CATEGORIAS_DESPESA : [];

  const handleSalvar = async () => {
    if (!tipo) {
      toast({ title: "Selecione Receita ou Despesa", variant: "destructive" });
      return;
    }
    const valorNum = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (!valorNum || valorNum <= 0) {
      toast({ title: "Digite um valor válido", variant: "destructive" });
      return;
    }
    if (!categoria) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }

    setSalvando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id, pontos_total")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.familia_id) {
        toast({ title: "Família não encontrada", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("transacoes").insert({
        familia_id: profile.familia_id,
        usuario_id: session.user.id,
        tipo,
        valor: valorNum,
        categoria,
        descricao: descricao || null,
        data_transacao: data,
        recorrente: false,
        tags: [],
      });
      if (error) throw error;

      // Use RPC for gamification points
      await supabase.rpc("add_gamification_points", {
        p_pontos: 10,
        p_tipo_evento: "transacao_criada",
        p_descricao: "Cadastrou transação",
      });

      if (navigator.vibrate) navigator.vibrate(200);
      toast({ title: "✅ Transação salva! +10 pontos 🎉" });
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
          <button
            onClick={() => { setTipo("receita"); setCategoria(""); }}
            className="py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: tipo === "receita"
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "rgba(255,255,255,0.05)",
              color: tipo === "receita" ? "#fff" : "rgba(255,255,255,0.6)",
              border: tipo === "receita" ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            💰 Receita
          </button>
          <button
            onClick={() => { setTipo("despesa"); setCategoria(""); }}
            className="py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: tipo === "despesa"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "rgba(255,255,255,0.05)",
              color: tipo === "despesa" ? "#fff" : "rgba(255,255,255,0.6)",
              border: tipo === "despesa" ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            💸 Despesa
          </button>
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

        {tipo && (
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
        )}

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

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-4 rounded-xl font-bold text-lg mt-6"
          style={{
            background: salvando
              ? "rgba(212,175,55,0.5)"
              : "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)",
            boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            color: "#000",
          }}
        >
          {salvando ? "⏳ Salvando..." : "✅ Salvar Transação"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
