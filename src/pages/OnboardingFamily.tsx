import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Home, KeyRound } from "lucide-react";

export default function OnboardingFamily() {
  const { user } = useAuth();
  const { criarFamilia } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modo, setModo] = useState<"escolha" | "criar">("escolha");
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCriar = async () => {
    if (!nomeFamilia.trim() || nomeFamilia.trim().length < 2) {
      toast({ title: "❌ Nome da família deve ter pelo menos 2 caracteres", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await criarFamilia(nomeFamilia.trim(), user.id);
      toast({ title: "🏠 Família criada com sucesso!" });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar família";
      console.error("Erro ao criar família:", err);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full gradient-gold shadow-lg shadow-primary/30">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-primary">Bem-vindo ao Legacy Kingdom</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.user_metadata?.nome_completo ? `Olá, ${user.user_metadata.nome_completo.split(" ")[0]}! ` : ""}
            Como deseja começar?
          </p>
        </div>

        {modo === "escolha" ? (
          <div className="space-y-4">
            <Card
              className="cursor-pointer card-glass-gold hover:border-primary transition-colors"
              onClick={() => setModo("criar")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Home className="h-5 w-5 text-primary" /> Criar minha família
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comece do zero e convide seus familiares
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer card-glass hover:border-primary transition-colors"
              onClick={() => navigate("/join-family")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5 text-primary" /> Entrar com código
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tenho um código de convite da minha família
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Nome da família (ex: Família Silva)"
              value={nomeFamilia}
              onChange={(e) => setNomeFamilia(e.target.value)}
              className="min-h-[48px] input-premium"
              disabled={loading}
            />
            <Button
              onClick={handleCriar}
              className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
              disabled={loading || !nomeFamilia.trim()}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🏠 Criar Família"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setModo("escolha")}
            >
              ← Voltar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
