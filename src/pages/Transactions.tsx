import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransacoes, type Transacao } from "@/hooks/useTransacoes";
import { useGamificacao } from "@/hooks/useGamificacao";
import TransacaoCard from "@/components/TransacaoCard";
import BottomNav from "@/components/BottomNav";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Transactions() {
  const { user } = useAuth();
  const { profile, buscarPerfil } = useProfile();
  const { transacoes, buscarTransacoes, excluirTransacao } = useTransacoes();
  const { adicionarPontos } = useGamificacao();
  const { toast } = useToast();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    setMes(m);
    setAno(a);
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    try {
      await excluirTransacao(deleteId);
      await adicionarPontos(user.id, -10, "excluir_transacao", "Excluiu transação");
      toast({ title: "🗑️ Transação excluída. -10 pontos" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  // Agrupar por data
  const grupos: Record<string, Transacao[]> = {};
  transacoes.forEach((t) => {
    const key = t.data_transacao;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
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

        {Object.keys(grupos).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma transação</p>
        ) : (
          Object.entries(grupos).map(([data, items]) => (
            <div key={data}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="relative group">
                    <TransacaoCard transacao={t} />
                    <AlertDialog open={deleteId === t.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/20"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Você perderá 10 pontos.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
