import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Info, MessageSquare, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notificacoes, setNotificacoes] = useState(() => localStorage.getItem("cl_notif") !== "false");
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [suporteOpen, setSuporteOpen] = useState(false);
  const [tipoTicket, setTipoTicket] = useState("ajuda");
  const [mensagemTicket, setMensagemTicket] = useState("");
  const [enviandoTicket, setEnviandoTicket] = useState(false);

  useEffect(() => {
    localStorage.setItem("cl_notif", String(notificacoes));
  }, [notificacoes]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as any).prompt();
    } else {
      toast({ title: "📱 Para instalar, use 'Adicionar à tela inicial' no menu do navegador." });
    }
  };

  const handleEnviarTicket = () => {
    if (!mensagemTicket.trim()) {
      toast({ title: "Descreva sua mensagem antes de enviar", variant: "destructive" });
      return;
    }
    setEnviandoTicket(true);
    try {
      const tipoLabel = tipoTicket === "ajuda" ? "Ajuda" : tipoTicket === "melhoria" ? "Sugestão de Melhoria" : "Reclamação";
      const subject = encodeURIComponent(`[Crown & Legacy] ${tipoLabel}`);
      const body = encodeURIComponent(`Tipo: ${tipoLabel}\n\nMensagem:\n${mensagemTicket.trim()}\n\n---\nEnviado pelo app Crown & Legacy`);
      window.open(`mailto:suport@crownlegacy.app?subject=${subject}&body=${body}`, "_blank");
      toast({ title: "✅ Abrindo seu e-mail...", description: "Envie a mensagem para suport@crownlegacy.app" });
      setMensagemTicket("");
      setSuporteOpen(false);
    } catch {
      toast({ title: "Erro ao abrir e-mail", variant: "destructive" });
    } finally {
      setEnviandoTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Configurações</h1>
        </div>

        <Card className="card-glass">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Notificações</Label>
              <Switch checked={notificacoes} onCheckedChange={setNotificacoes} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleInstall} variant="outline" className="w-full min-h-[48px] border-primary/30 text-primary">
          <Download className="h-4 w-4 mr-2" /> Instalar App (PWA)
        </Button>

        {/* Suporte */}
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!suporteOpen ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Precisa de ajuda, tem uma sugestão ou quer reportar um problema?
                </p>
                <Button variant="outline" className="w-full min-h-[44px] border-primary/30 text-primary" onClick={() => setSuporteOpen(true)}>
                  <Send className="h-4 w-4 mr-2" /> Abrir ticket de suporte
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    value={tipoTicket}
                    onChange={(e) => setTipoTicket(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-border bg-input text-foreground outline-none text-sm"
                  >
                    <option value="ajuda">❓ Preciso de ajuda</option>
                    <option value="melhoria">💡 Sugestão de melhoria</option>
                    <option value="reclamacao">⚠️ Reclamação</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mensagem</Label>
                  <Textarea
                    placeholder="Descreva sua mensagem..."
                    value={mensagemTicket}
                    onChange={(e) => setMensagemTicket(e.target.value)}
                    className="min-h-[100px] resize-none"
                    maxLength={1000}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{mensagemTicket.length}/1000</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Será aberto seu app de e-mail para enviar para suport@crownlegacy.app
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setSuporteOpen(false); setMensagemTicket(""); }}>
                    Cancelar
                  </Button>
                  <Button className="flex-1 gradient-gold text-primary-foreground font-bold" onClick={handleEnviarTicket} disabled={enviandoTicket}>
                    <Send className="h-4 w-4 mr-1" />
                    {enviandoTicket ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Sobre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Crown & Legacy</p>
            <p>Wealth Intelligence Platform</p>
            <p>© 2026 Crown & Legacy. Todos os direitos reservados.</p>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
