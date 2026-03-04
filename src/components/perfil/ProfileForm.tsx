import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileFormProps {
  userId: string;
  nomeInicial: string;
  telefoneInicial: string;
  dataNascInicial: string;
  roleInicial: string;
  email: string;
}

const ROLES = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
];

const formatTelefone = (value: string) => {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
};

export default function ProfileForm({ userId, nomeInicial, telefoneInicial, dataNascInicial, roleInicial, email }: ProfileFormProps) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [dataNasc, setDataNasc] = useState(dataNascInicial);
  const [role, setRole] = useState(roleInicial || "pai");
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setNome(nomeInicial);
    setTelefone(telefoneInicial);
    setDataNasc(dataNascInicial);
    setRole(roleInicial || "pai");
  }, [nomeInicial, telefoneInicial, dataNascInicial, roleInicial]);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: nome.trim(),
          telefone: telefone || null,
          data_nascimento: dataNasc || null,
          role,
        })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "Perfil atualizado! ✅" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar perfil";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} className="min-h-[48px] input-premium" disabled={salvando} />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled className="min-h-[48px] opacity-50" />
      </div>

      <div className="space-y-2">
        <Label>Telefone</Label>
        <Input
          placeholder="(XX) XXXXX-XXXX"
          value={telefone}
          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          className="min-h-[48px] input-premium"
          disabled={salvando}
        />
      </div>

      <div className="space-y-2">
        <Label>Data de nascimento</Label>
        <Input
          type="date"
          value={dataNasc}
          onChange={(e) => setDataNasc(e.target.value)}
          className="min-h-[48px] input-premium"
          disabled={salvando}
        />
      </div>

      <div className="space-y-2">
        <Label>Papel na família</Label>
        <Select value={role} onValueChange={setRole} disabled={salvando}>
          <SelectTrigger className="min-h-[48px] input-premium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSalvar} disabled={salvando} className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold">
        {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
      </Button>
    </div>
  );
}
