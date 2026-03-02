import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGamificacao } from "@/hooks/useGamificacao";
import BottomNav from "@/components/BottomNav";
import { Loader2 } from "lucide-react";

const EMOJIS = [
  { emoji: "😰", label: "Péssimo" },
  { emoji: "😟", label: "Ruim" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "😊", label: "Bom" },
  { emoji: "😁", label: "Ótimo" },
];

export default function Checkin() {
  const { user } = useAuth();
  const { adicionarPontos, buscarEventos } = useGamificacao();
  const { toast } = useToast();

  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [jaFez, setJaFez] = useState(false);

  useEffect(() => {
    if (!user) return;
    buscarEventos(user.id).then((eventos) => {
      const hoje = new Date().toDateString();
      const fez = eventos.some((e) => e.tipo_evento === "checkin" && e.created_at && new Date(e.created_at).toDateString() === hoje);
      setJaFez(fez);
    });
  }, [user, buscarEventos]);

  const handleRegistrar = async () => {
    if (selecionado === null || !user) return;
    setSalvando(true);
    try {
      await adicionarPontos(user.id, 5, "checkin", `Check-in: ${EMOJIS[selecionado].emoji} ${texto}`);
      toast({ title: `${EMOJIS[selecionado].emoji} Check-in registrado! +5 pontos` });
      setJaFez(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao registrar", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-6">
        <h1 className="text-lg font-bold text-foreground">Check-in Diário</h1>

        {jaFez ? (
          <Card className="card-glass-gold">
            <CardContent className="p-6 text-center">
              <span className="text-4xl">✅</span>
              <p className="mt-2 text-foreground font-medium">Você já fez seu check-in hoje!</p>
              <p className="text-sm text-muted-foreground">Volte amanhã para ganhar mais pontos</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-center text-foreground">Como estão suas finanças hoje?</p>

            <div className="flex justify-center gap-4">
              {EMOJIS.map((e, i) => (
                <button
                  key={i}
                  onClick={() => setSelecionado(i)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    selecionado === i ? "bg-primary/20 scale-110" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-3xl">{e.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{e.label}</span>
                </button>
              ))}
            </div>

            {selecionado !== null && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Quer compartilhar algo? (opcional)"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="min-h-[80px] input-premium"
                />
                <Button
                  onClick={handleRegistrar}
                  disabled={salvando}
                  className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
                >
                  {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar Check-in"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
