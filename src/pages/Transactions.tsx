import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes, type Transacao } from "@/hooks/useTransacoes";
import { formatarMoeda } from "@/lib/utils";
import TransacaoCard from "@/components/TransacaoCard";
import BottomNav from "@/components/BottomNav";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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
      // Refresh list
      if (profile?.familia_id) buscarTransacoes(profile.familia_id, mes, ano);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEditar = (t: Transacao) => {
    // Navigate to edit page or show edit modal - for now navigate
    navigate(`/nova-transacao?edit=${t.id}`);
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
                {new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
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
      </div>
      <BottomNav />
    </div>
  );
}
