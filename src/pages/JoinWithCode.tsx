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
      await entrarFamilia(codigo.toUpperCase(), user.id);
      toast({ title: "🎉 Você entrou na família!" });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código não encontrado";
      console.error("Erro ao entrar na família:", err);
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
