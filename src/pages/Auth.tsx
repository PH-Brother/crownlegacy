import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginSenha) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signIn(loginEmail, loginSenha);
      toast({ title: "✅ Bem-vindo de volta!" });
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cadEmail || !cadSenha) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (cadSenha.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signUp(cadEmail, cadSenha, nome);
      toast({ title: "✅ Conta criada!", description: "Verifique seu email para confirmar." });
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] space-y-8">
        <div className="text-center">
          <span className="text-5xl">👑</span>
          <h1 className="mt-3 text-2xl font-bold text-primary">Legacy Kingdom</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão financeira com sabedoria</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="cadastro">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="min-h-[48px]"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className="min-h-[48px]"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="cadastro">
            <form onSubmit={handleCadastro} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="min-h-[48px]"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  className="min-h-[48px]"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={cadSenha}
                  onChange={(e) => setCadSenha(e.target.value)}
                  className="min-h-[48px]"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
