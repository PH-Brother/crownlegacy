import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes, type Transacao } from "@/hooks/useTransacoes";
import { formatarMoeda } from "@/lib/utils";
import { formatarData } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import TransacaoCard from "@/components/TransacaoCard";
import BottomNav from "@/components/BottomNav";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CATEGORIAS = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
  "Lazer", "Assinaturas", "Roupas", "Dízimo/Oferta", "Investimentos", "Outros",
];

// Convert DD/MM/AAAA or AAAA-MM-DD → AAAA-MM-DD for input[type=date]
const toInputDate = (d: string): string => {
  if (!d) return "";
  if (d.includes("/")) {
    const p = d.split("/");
    if (p.length === 3) return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
  }
  return d;
};

interface EditFormData {
  data_transacao: string;
  descricao: string;
  valor: string;
  categoria: string;
  tipo: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, excluirTransacao, calcularTotais } = useTransacoes();
  const { toast } = useToast();
  const navigate = useNavigate();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editTransacao, setEditTransacao] = useState<Transacao | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    data_transacao: "", descricao: "", valor: "", categoria: "", tipo: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
  }, [profile?.familia_id, mes, ano, buscarTransacoes]);

  const mudarMes = (dir: number) => {
    let m = mes + dir, a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    try {
      await excluirTransacao(deleteId);
      toast({ title: "🗑️ Transação excluída" });
      if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEditar = (t: Transacao) => {
    setEditTransacao(t);
    setEditForm({
      data_transacao: toInputDate(t.data_transacao),
      descricao: t.descricao || "",
      valor: String(t.valor),
      categoria: t.categoria,
      tipo: t.tipo,
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleSalvar = async () => {
    if (!editTransacao || !user) return;

    // Validate
    const errors: Record<string, string> = {};
    if (!editForm.data_transacao) errors.data_transacao = "Data é obrigatória";
    if (!editForm.descricao.trim()) errors.descricao = "Descrição é obrigatória";
    if (!editForm.valor || Number(editForm.valor) <= 0) errors.valor = "Valor deve ser maior que zero";
    if (!editForm.categoria) errors.categoria = "Categoria é obrigatória";

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditLoading(true);
    const { error } = await supabase
      .from("transacoes")
      .update({
        data_transacao: editForm.data_transacao,
        descricao: editForm.descricao.trim(),
        valor: Number(editForm.valor),
        categoria: editForm.categoria,
        tipo: editForm.tipo,
      })
      .eq("id", editTransacao.id)
      .eq("usuario_id", user.id);
    setEditLoading(false);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
      return;
    }
    toast({ title: "✅ Transação atualizada" });
    setEditOpen(false);
    setEditTransacao(null);
    if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
  };

  const filtered = filtroTipo === "todos" ? transacoes : transacoes.filter(t => t.tipo === filtroTipo);
  const totais = calcularTotais(filtered);

  // Agrupar por data
  const grupos: Record<string, Transacao[]> = {};
  filtered.forEach((t) => {
    const key = t.data_transacao;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Transações</h1>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold">{MESES[mes - 1]} {ano}</span>
          <Button variant="ghost" size="icon" onClick={() => mudarMes(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Filtro */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="flex-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Total: {formatarMoeda(filtroTipo === "receita" ? totais.receitas : filtroTipo === "despesa" ? totais.despesas : totais.receitas - totais.despesas)}
          </span>
        </div>

        {Object.keys(grupos).length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl block mb-2">📊</span>
            <p className="text-muted-foreground">Nenhuma transação</p>
          </div>
        ) : (
          Object.entries(grupos).map(([data, items]) => (
            <div key={data}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {formatarData(data)} — {new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}
              </p>
              <div className="space-y-2">
                {items.map((t) => (
                  <TransacaoCard
                    key={t.id}
                    transacao={t}
                    onEdit={handleEditar}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit modal */}
        <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditTransacao(null); } }}>
          <DialogContent className="bg-card border-border max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Editar Transação</DialogTitle>
              <DialogDescription>Altere os campos e salve.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={editForm.data_transacao}
                  onChange={(e) => { setEditForm(f => ({ ...f, data_transacao: e.target.value })); setEditErrors(er => ({ ...er, data_transacao: "" })); }}
                />
                {editErrors.data_transacao && <p className="text-xs text-destructive">{editErrors.data_transacao}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={editForm.descricao}
                  onChange={(e) => { setEditForm(f => ({ ...f, descricao: e.target.value })); setEditErrors(er => ({ ...er, descricao: "" })); }}
                  placeholder="Descrição da transação"
                />
                {editErrors.descricao && <p className="text-xs text-destructive">{editErrors.descricao}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.valor}
                  onChange={(e) => { setEditForm(f => ({ ...f, valor: e.target.value })); setEditErrors(er => ({ ...er, valor: "" })); }}
                />
                {editErrors.valor && <p className="text-xs text-destructive">{editErrors.valor}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={editForm.categoria} onValueChange={(val) => { setEditForm(f => ({ ...f, categoria: val })); setEditErrors(er => ({ ...er, categoria: "" })); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.categoria && <p className="text-xs text-destructive">{editErrors.categoria}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(val) => setEditForm(f => ({ ...f, tipo: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditTransacao(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={editLoading} className="gradient-gold text-primary-foreground font-bold">
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <BottomNav />
    </div>
  );
}
