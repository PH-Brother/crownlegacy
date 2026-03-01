import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

export default function Settings() {
  const { toast } = useToast();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("lk_darkMode") !== "false");
  const [notificacoes, setNotificacoes] = useState(() => localStorage.getItem("lk_notif") !== "false");
  const [moeda, setMoeda] = useState(() => localStorage.getItem("lk_moeda") || "BRL");
  const [diaFechamento, setDiaFechamento] = useState(() => localStorage.getItem("lk_diaFechamento") || "1");

  useEffect(() => {
    localStorage.setItem("lk_darkMode", String(darkMode));
    localStorage.setItem("lk_notif", String(notificacoes));
    localStorage.setItem("lk_moeda", moeda);
    localStorage.setItem("lk_diaFechamento", diaFechamento);
  }, [darkMode, notificacoes, moeda, diaFechamento]);

  const salvar = () => toast({ title: "✅ Configurações salvas!" });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-6">
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>

        <div className="flex items-center justify-between">
          <Label>Modo escuro</Label>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>

        <div className="flex items-center justify-between">
          <Label>Notificações</Label>
          <Switch checked={notificacoes} onCheckedChange={setNotificacoes} />
        </div>

        <div className="space-y-2">
          <Label>Moeda</Label>
          <Select value={moeda} onValueChange={setMoeda}>
            <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">R$ (Real)</SelectItem>
              <SelectItem value="USD">$ (Dólar)</SelectItem>
              <SelectItem value="EUR">€ (Euro)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dia de fechamento do mês</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={diaFechamento}
            onChange={(e) => setDiaFechamento(e.target.value)}
            className="min-h-[48px]"
          />
        </div>

        <Button onClick={salvar} className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold">
          Salvar Configurações
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
