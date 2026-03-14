import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notificacoes, setNotificacoes] = useState(() => localStorage.getItem("cl_notif") !== "false");
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

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
