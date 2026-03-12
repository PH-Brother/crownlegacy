import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") !== "signup";
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showCadPass, setShowCadPass] = useState(false);

  const navigateAfterAuth = async (userId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const { data: profile } = await supabase.
    from("profiles").
    select("familia_id").
    eq("id", userId).
    maybeSingle();
    if (profile?.familia_id) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/onboarding", { replace: true });
    }
  };

  const handleForgotPassword = async () => {
  if (!loginEmail) {
    toast({ title: "Digite seu email primeiro", variant: "destructive" });
    return;
  }

  setLoading(true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`  // ✅ CORRIGIDO
    });
      if (error) throw error;
      toast({ title: "📧 Email de recuperação enviado!", description: "Verifique sua caixa de entrada." });
    } catch {
      toast({ title: "Erro ao enviar email", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginSenha) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await signIn(loginEmail, loginSenha);
      toast({ title: "✅ Bem-vindo de volta!" });
      await navigateAfterAuth(data.user.id);
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
      const data = await signUp(cadEmail, cadSenha, nome);
      toast({ title: "✅ Conta criada!", description: "Verifique seu email para confirmar." });
      if (data.user) {
        await navigateAfterAuth(data.user.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

    return (
  <div
    className="fixed inset-0 flex flex-col items-center overflow-y-auto px-4 sm:px-5 lg:px-6"
    style={{
      background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-dark)) 100%)"
    }}>

    {/* Vignette overlay */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)"
      }} />

    <div className="relative z-10 flex w-full max-w-[360px] flex-col items-center py-8 sm:py-12 min-h-screen">

      {/* Logo */}
      <img
        alt="Crown & Legacy Logo"
        className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] lg:w-[200px] lg:h-[200px] mb-5 sm:mb-[22px] lg:mb-6 animate-[fadeInScale_400ms_ease-out_both] object-cover rounded-3xl"
        src="/lovable-uploads/ba7baad6-0a60-4d06-9921-d9d30e381ca0.png" />

      {/* Title */}
      <h1
        className="font-display text-[30px] sm:text-[36px] lg:text-[44px] font-bold text-center leading-tight tracking-[2px] mb-1.5 animate-[fadeInUp_300ms_ease-out_80ms_both]"
        style={{ color: "hsl(var(--accent-light))" }}>
        Crown &amp; Legacy
      </h1>

      {/* Tagline */}
      <p
        className="text-[13px] sm:text-sm text-center mb-5 sm:mb-6 lg:mb-[22px] animate-[fadeInUp_300ms_ease-out_160ms_both]"
        style={{ color: "hsl(var(--foreground) / 0.85)" }}>
        Protect. Grow. Wealth.
      </p>

      {/* Subtitle */}
      <p
        className="text-[10px] sm:text-xs font-medium uppercase tracking-[3px] text-center mb-5 sm:mb-6 lg:mb-[22px] animate-[fadeInUp_300ms_ease-out_160ms_both]"
        style={{ color: "hsl(var(--foreground) / 0.6)" }}>
        WEALTH INTELLIGENCE PLATFORM
      </p>

      {/* Card */}
      <div
        className="w-full rounded-xl p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fadeInUp_300ms_ease-out_240ms_both]"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid hsl(var(--accent) / 0.2)"
        }}>
        
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className="flex-1 pb-2.5 text-[13px] font-medium transition-all duration-200 border-b-2"
            style={{
              color: isLogin ? "hsl(var(--accent-light))" : "hsl(var(--muted-foreground))",
              borderColor: isLogin ? "hsl(var(--accent-light))" : "transparent",
              fontWeight: isLogin ? 600 : 500
            }}>
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className="flex-1 pb-2.5 text-[13px] font-medium transition-all duration-200 border-b-2"
            style={{
              color: !isLogin ? "hsl(var(--accent-light))" : "hsl(var(--muted-foreground))",
              borderColor: !isLogin ? "hsl(var(--accent-light))" : "transparent",
              fontWeight: !isLogin ? 600 : 500
            }}>
            Criar Conta
          </button>
        </div>

        {/* Login form */}
        {isLogin &&
        <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                Email
              </label>
              <input
              id="login-email"
              type="email"
              placeholder="seu@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid hsl(var(--accent) / 0.2)",
                color: "hsl(var(--foreground))"
              }} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-senha" className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                Senha
              </label>
              <div className="relative">
                <input
                id="login-senha"
                type={showLoginPass ? "text" : "password"}
                placeholder="••••••••"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg px-3.5 py-2.5 pr-12 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid hsl(var(--accent) / 0.2)",
                  color: "hsl(var(--foreground))"
                }} />
                <button
                type="button"
                onClick={() => setShowLoginPass(!showLoginPass)}
                aria-label="Alternar visibilidade de senha"
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                style={{ color: "hsl(var(--muted-foreground))" }}>
                  {showLoginPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 mt-4"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
            }}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
            </button>
            <div className="text-center mt-3">
              <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-xs transition-colors duration-200 hover:underline"
              style={{ color: "hsl(var(--success))" }}>
                Esqueci minha senha
              </button>
            </div>
          </form>
        }

        {/* Signup form */}
        {!isLogin &&
        <form onSubmit={handleCadastro} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="cad-nome" className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                Nome completo
              </label>
              <input
              id="cad-nome"
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid hsl(var(--accent) / 0.2)",
                color: "hsl(var(--foreground))"
              }} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cad-email" className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                Email
              </label>
              <input
              id="cad-email"
              type="email"
              placeholder="seu@email.com"
              value={cadEmail}
              onChange={(e) => setCadEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid hsl(var(--accent) / 0.2)",
                color: "hsl(var(--foreground))"
              }} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cad-senha" className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                Senha
              </label>
              <div className="relative">
                <input
                id="cad-senha"
                type={showCadPass ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={cadSenha}
                onChange={(e) => setCadSenha(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg px-3.5 py-2.5 pr-12 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid hsl(var(--accent) / 0.2)",
                  color: "hsl(var(--foreground))"
                }} />
                <button
                type="button"
                onClick={() => setShowCadPass(!showCadPass)}
                aria-label="Alternar visibilidade de senha"
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                style={{ color: "hsl(var(--muted-foreground))" }}>
                  {showCadPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 mt-4"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
            }}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Conta"}
            </button>
          </form>
        }

      </div>

      {/* Spacer for scroll */}
      <div className="h-8" />

    </div>

  </div>
);