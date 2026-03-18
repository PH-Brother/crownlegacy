import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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

  const [tipo, setTipo] = useState<"receita" | "despesa" | "">("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [valorNum, setValorNum] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : tipo === "despesa" ? CATEGORIAS_DESPESA : [];

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setValorDisplay(""); setValorNum(0); return; }
    const num = parseInt(raw) / 100;
    setValorNum(num);
    setValorDisplay(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSalvar = async () => {
    if (!tipo) {
      toast.error("Selecione o tipo da transação");
      return;
    }
    if (valorNum <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    if (!categoria || categoria === "") {
      toast.error("Selecione uma categoria");
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
        toast.error("Família não encontrada");
        return;
      }

      const { error } = await supabase.from("transacoes").insert({
        familia_id: profile.familia_id,
        usuario_id: session.user.id,
        tipo,
        valor: valorNum,
        categoria,
        descricao: descricao.trim() || null,
        data_transacao: data,
        recorrente: false,
        tags: [],
      });
      if (error) throw error;

      await Promise.all([
        supabase.from("gamificacao_eventos").insert({
          usuario_id: session.user.id,
          tipo_evento: "transacao_criada",
          pontos_ganhos: 10,
          metadata: { categoria, tipo, valor: valorNum },
        }),
        supabase.from("profiles")
          .update({ pontos_total: (profile.pontos_total || 0) + 10 })
          .eq("id", session.user.id),
      ]);

      if (navigator.vibrate) navigator.vibrate(200);
      toast.success("✅ Transação salva! +10 pontos");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  // Step 1: Choose type
  if (!tipo) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Nova Transação</h1>
          </div>

          <p className="text-center text-muted-foreground text-sm">Qual o tipo da transação?</p>

          <div className="grid grid-cols-1 gap-3 mt-4">
            <button
              onClick={() => setTipo("receita")}
              className="py-6 rounded-xl font-bold text-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
              }}
            >
              💰 Receita
            </button>
            <button
              onClick={() => setTipo("despesa")}
              className="py-6 rounded-xl font-bold text-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
              }}
            >
              💸 Despesa
            </button>
          </div>

        </div>
        <BottomNav />
      </div>
    );
  }

  // Step 2: Form
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTipo("")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {tipo === "receita" ? "💰 Nova Receita" : "💸 Nova Despesa"}
          </h1>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            value={valorDisplay}
            onChange={handleValorChange}
            className="min-h-[48px] text-2xl font-bold"
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

        <button
          onClick={handleSalvar}
          disabled={salvando}
          style={{
            background: salvando
              ? "rgba(212,175,55,0.5)"
              : "linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)",
            color: "#000",
            fontWeight: "bold",
            padding: "16px",
            borderRadius: "12px",
            width: "100%",
            fontSize: "16px",
            border: "none",
            cursor: salvando ? "not-allowed" : "pointer",
            boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            marginTop: "24px",
          }}
        >
          {salvando ? "⏳ Salvando..." : "✅ Salvar Transação"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
