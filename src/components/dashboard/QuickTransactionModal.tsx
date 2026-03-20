import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIAS_RECEITA = [
  { value: "Salário", emoji: "💰" },
  { value: "Freelance", emoji: "💻" },
  { value: "Investimentos", emoji: "📈" },
  { value: "Presente", emoji: "🎁" },
  { value: "Outros", emoji: "📦" },
];

const CATEGORIAS_DESPESA = [
  { value: "Moradia", emoji: "🏠" },
  { value: "Alimentação", emoji: "🍽️" },
  { value: "Transporte", emoji: "🚗" },
  { value: "Saúde", emoji: "❤️" },
  { value: "Educação", emoji: "📚" },
  { value: "Lazer", emoji: "🎉" },
  { value: "Assinaturas", emoji: "📱" },
  { value: "Outros", emoji: "📦" },
];

interface QuickTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "receita" | "despesa";
  familiaId: string;
  userId: string;
  onSuccess: () => void;
}

export default function QuickTransactionModal({
  open, onOpenChange, tipo, familiaId, userId, onSuccess,
}: QuickTransactionModalProps) {
  const [valorDisplay, setValorDisplay] = useState("");
  const [valorNum, setValorNum] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setValorDisplay(""); setValorNum(0); return; }
    const num = parseInt(raw) / 100;
    setValorNum(num);
    setValorDisplay(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const resetForm = () => {
    setValorDisplay(""); setValorNum(0); setCategoria("");
    setDescricao(""); setData(new Date().toISOString().split("T")[0]);
  };

  const handleSalvar = async () => {
    if (valorNum <= 0) { toast({ title: "Digite um valor válido", variant: "destructive" }); return; }
    if (!categoria) { toast({ title: "Selecione uma categoria", variant: "destructive" }); return; }

    setSalvando(true);
    try {
      const { error } = await supabase.from("transacoes").insert({
        familia_id: familiaId,
        usuario_id: userId,
        user_id: userId,
        tipo,
        valor: valorNum,
        categoria,
        descricao: descricao.trim() || null,
        data_transacao: data,
        recorrente: false,
        tags: [],
      });
      if (error) throw error;

      // Gamification
      const { data: prof } = await supabase.from("profiles").select("pontos_total").eq("id", userId).maybeSingle();
      await Promise.all([
        supabase.from("gamificacao_eventos").insert({
          usuario_id: userId, tipo_evento: "transacao_criada", pontos_ganhos: 10,
          metadata: { categoria, tipo, valor: valorNum },
        }),
        supabase.from("profiles").update({ pontos_total: (prof?.pontos_total || 0) + 10 }).eq("id", userId),
      ]);

      if (navigator.vibrate) navigator.vibrate(200);
      toast({ title: "Transação salva! ✅ +10 pontos" });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Erro ao salvar transação", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <SheetContent side="bottom" className="bg-card border-t border-primary/20 rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary font-display">
            {tipo === "receita" ? "💰 Nova Receita" : "💸 Nova Despesa"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="text" inputMode="numeric" placeholder="0,00" value={valorDisplay}
              onChange={handleValorChange} className="min-h-[48px] text-xl font-bold input-premium" disabled={salvando} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria} disabled={salvando}>
              <SelectTrigger className="min-h-[48px] input-premium"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.emoji} {c.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input placeholder="Ex: Almoço com a família" value={descricao}
              onChange={(e) => setDescricao(e.target.value)} className="min-h-[48px] input-premium" disabled={salvando} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="min-h-[48px] input-premium" disabled={salvando} />
          </div>
          <button onClick={handleSalvar} disabled={salvando}
            className="w-full min-h-[48px] btn-premium rounded-xl text-base flex items-center justify-center gap-2 mt-2">
            {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : "✅ Salvar"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
