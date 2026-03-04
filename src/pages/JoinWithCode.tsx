import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";

export default function JoinWithCode() {
  const { user } = useAuth();
  const { entrarFamilia } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEntrar = async () => {
    if (codigo.length !== 8 || !user) return;
    setLoading(true);
    try {
      // Find family by invite code
      const { data: familiaEncontrada, error: buscaError } = await supabase
        .from("familias")
        .select("id")
        .eq("codigo_convite", codigo.toUpperCase())
        .single();

      if (buscaError || !familiaEncontrada) {
        toast({ title: "Código inválido", description: "Verifique e tente novamente.", variant: "destructive" });
        return;
      }

      // Check member limit
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("familia_id", familiaEncontrada.id);

      if ((count ?? 0) >= 5) {
        toast({ title: "Limite atingido", description: "Esta família já tem 5 membros.", variant: "destructive" });
        return;
      }

      // Link user to family
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ familia_id: familiaEncontrada.id, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileError) throw profileError;

      toast({ title: "🎉 Você entrou na família!" });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar na família";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="text-center">
          <span className="text-4xl">🔑</span>
          <h1 className="mt-2 text-xl font-bold text-foreground">Entrar com código</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digite o código de 8 caracteres da sua família
          </p>
        </div>

        <Input
          placeholder="EX: ABCD1234"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 8))}
          className="min-h-[48px] text-center text-lg tracking-widest font-mono input-premium"
          maxLength={8}
          disabled={loading}
        />

        <Button
          onClick={handleEntrar}
          className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
          disabled={loading || codigo.length !== 8}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar na Família"}
        </Button>
      </div>
    </div>
  );
}
