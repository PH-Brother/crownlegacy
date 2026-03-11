import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, KeyRound, Check, Loader2 } from "lucide-react";

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Step 1 fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [role, setRole] = useState("");

  // Step 2 fields
  const [familyMode, setFamilyMode] = useState<"choose" | "create" | "join">("choose");
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");

  // Step 3 data
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    const metaName = user.user_metadata?.nome_completo;
    if (metaName) setNome(metaName);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || authLoading) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("familia_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.familia_id) {
        navigate("/dashboard", { replace: true });
      }
    };
    check();
  }, [user, authLoading, navigate]);

  const goToStep = (s: number) => {
    setDirection(s > step ? "forward" : "back");
    setStep(s);
  };

  const handleStep1 = async () => {
    if (nome.trim().length < 2) {
      toast({ title: "Nome deve ter no mínimo 2 caracteres", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const updateData: Record<string, string> = { nome_completo: nome.trim() };
      if (telefone) updateData.telefone = telefone;
      if (dataNascimento) updateData.data_nascimento = dataNascimento;
      if (role) updateData.role = role;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
      if (error) throw error;
      goToStep(2);
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    const trimmed = nomeFamilia.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      toast({ title: "Nome da família deve ter entre 2 e 50 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado");

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const inviteCode = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");

      const { data: familia, error: familiaError } = await supabase
        .from("familias")
        .insert({
          nome: trimmed,
          plano: "trial",
          data_fim_trial: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          codigo_convite: inviteCode,
        })
        .select("id, nome, codigo_convite, data_fim_trial")
        .single();
      if (familiaError) throw familiaError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ familia_id: familia.id, updated_at: new Date().toISOString() })
        .eq("id", authUser.id);
      if (profileError) throw profileError;

      setTrialEndDate(familia.data_fim_trial);
      goToStep(3);
    } catch (err) {
      toast({ title: "Erro ao criar família. Tente novamente.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    const formattedCode = codigoConvite.toUpperCase().trim();
    if (formattedCode.length !== 8) {
      toast({ title: "Código deve ter 8 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado");

      const { data: familiaEncontrada, error: buscaError } = await supabase
        .from("familias")
        .select("id, nome, data_fim_trial, plano")
        .eq("codigo_convite", formattedCode)
        .single();

      if (buscaError || !familiaEncontrada) {
        toast({ title: "Código inválido. Verifique e tente novamente.", variant: "destructive" });
        return;
      }

      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("familia_id", familiaEncontrada.id);

      if ((count ?? 0) >= 5) {
        toast({ title: "Esta família já atingiu o limite de 5 membros.", variant: "destructive" });
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ familia_id: familiaEncontrada.id, updated_at: new Date().toISOString() })
        .eq("id", authUser.id);
      if (profileError) throw profileError;

      setTrialEndDate(familiaEncontrada.data_fim_trial);
      goToStep(3);
    } catch (err) {
      toast({ title: "Erro ao entrar na família. Tente novamente.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTrialDate = () => {
    if (!trialEndDate) return "14 dias";
    return new Date(trialEndDate).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const progressValue = (step / 3) * 100;

  const animationClass = direction === "forward"
    ? "animate-fade-in"
    : "animate-fade-in";

  if (authLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-dark)) 100%)"
        }}>
        <img
          alt="Crown & Legacy Logo"
          className="w-[120px] h-[120px] rounded-3xl animate-[fadeInScale_400ms_ease-out_both] object-cover"
          src="/lovable-uploads/ba7baad6-0a60-4d06-9921-d9d30e381ca0.png" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-auto"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-dark)) 100%)"
      }}>
      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)" }} />

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-4">
        <div className="mx-auto max-w-[360px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: "hsl(var(--foreground) / 0.6)" }}>Etapa {step} de 3</span>
            <img
              alt="Crown & Legacy Logo"
              className="w-8 h-8 rounded-lg object-cover"
              src="/lovable-uploads/ba7baad6-0a60-4d06-9921-d9d30e381ca0.png" />
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressValue}%`,
                background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-[360px]">
          {/* STEP 1 */}
          {step === 1 && (
            <div key="step1" className={`${animationClass}`}>
              <div className="text-center mb-5">
                <h1
                  className="font-display text-[30px] sm:text-[36px] lg:text-[44px] font-bold leading-tight tracking-[2px] mb-1.5 animate-[fadeInUp_300ms_ease-out_80ms_both]"
                  style={{ color: "hsl(var(--accent-light))" }}>
                  Bem-vindo ao Reino
                </h1>
                <p
                  className="text-[13px] sm:text-sm animate-[fadeInUp_300ms_ease-out_160ms_both]"
                  style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                  Vamos começar conhecendo você
                </p>
              </div>

              <div
                className="w-full rounded-xl p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fadeInUp_300ms_ease-out_240ms_both]"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid hsl(var(--accent) / 0.2)"
                }}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Nome completo *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      className="h-10 text-[13px] px-3.5 border-accent/20 bg-white/[0.08]"
                      style={{ color: "hsl(var(--foreground))" }}
                      disabled={loading}
                      maxLength={100}
                    />
                    {nome.length > 0 && nome.trim().length < 2 && (
                      <p className="text-xs text-destructive">Mínimo 2 caracteres</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Telefone</Label>
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="h-10 text-[13px] px-3.5 border-accent/20 bg-white/[0.08]"
                      style={{ color: "hsl(var(--foreground))" }}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Data de nascimento</Label>
                    <Input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="h-10 text-[13px] px-3.5 border-accent/20 bg-white/[0.08]"
                      style={{ color: "hsl(var(--foreground))" }}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Seu papel na família</Label>
                    <Select value={role} onValueChange={setRole} disabled={loading}>
                      <SelectTrigger className="h-10 text-[13px] px-3.5 border-accent/20 bg-white/[0.08]" style={{ color: "hsl(var(--foreground))" }}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="responsavel">Responsável</SelectItem>
                        <SelectItem value="filho">Filho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <button
                  onClick={handleStep1}
                  disabled={loading || nome.trim().length < 2}
                  className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 mt-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
                  }}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Próximo →"}
                </button>

                <p className="text-center text-xs italic mt-3" style={{ color: "hsl(var(--accent))" }}>
                  Provérbios 21:5 — "Os planos do diligente levam à abundância"
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div key="step2" className={`${animationClass}`}>
              <div className="text-center mb-5">
                <h1
                  className="font-display text-[30px] sm:text-[36px] lg:text-[44px] font-bold leading-tight tracking-[2px] mb-1.5 animate-[fadeInUp_300ms_ease-out_80ms_both]"
                  style={{ color: "hsl(var(--accent-light))" }}>
                  Funde seu Reino
                </h1>
                <p
                  className="text-[13px] sm:text-sm animate-[fadeInUp_300ms_ease-out_160ms_both]"
                  style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                  Gerencie as finanças em família
                </p>
              </div>

              <div className="animate-[fadeInUp_300ms_ease-out_240ms_both]">
                {familyMode === "choose" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid hsl(var(--accent) / 0.3)"
                      }}
                      onClick={() => setFamilyMode("create")}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <Crown className="h-5 w-5" style={{ color: "hsl(var(--accent-light))" }} />
                        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Criar minha família</h3>
                      </div>
                      <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.6)" }}>Comece do zero e convide seus familiares</p>
                    </div>

                    <div
                      className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid hsl(var(--accent) / 0.2)"
                      }}
                      onClick={() => setFamilyMode("join")}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <KeyRound className="h-5 w-5" style={{ color: "hsl(var(--accent-light))" }} />
                        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Entrar em uma família</h3>
                      </div>
                      <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.6)" }}>Tenho um código de convite</p>
                    </div>

                    <button
                      className="w-full text-xs mt-3 transition-colors duration-200 hover:underline"
                      style={{ color: "hsl(var(--foreground) / 0.5)" }}
                      onClick={() => goToStep(1)}>
                      ← Voltar
                    </button>
                  </div>
                )}

                {familyMode === "create" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid hsl(var(--accent) / 0.3)"
                      }}>
                      <div className="flex items-center gap-3 mb-3">
                        <Crown className="h-5 w-5" style={{ color: "hsl(var(--accent-light))" }} />
                        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Criar minha família</h3>
                      </div>
                      <input
                        placeholder="Nome da família (ex: Família Silva)"
                        value={nomeFamilia}
                        onChange={(e) => setNomeFamilia(e.target.value.slice(0, 50))}
                        disabled={loading}
                        maxLength={50}
                        className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid hsl(var(--accent) / 0.2)",
                          color: "hsl(var(--foreground))"
                        }} />
                      {nomeFamilia.trim().length > 0 && nomeFamilia.trim().length < 2 && (
                        <p className="text-xs text-destructive mt-1">Mínimo 2 caracteres</p>
                      )}
                    </div>
                    <button
                      onClick={handleCreateFamily}
                      disabled={loading || nomeFamilia.trim().length < 2}
                      className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                        color: "hsl(var(--accent-foreground))",
                        boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
                      }}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🏠 Criar Família"}
                    </button>
                    <button
                      className="w-full text-xs mt-1 transition-colors duration-200 hover:underline"
                      style={{ color: "hsl(var(--foreground) / 0.5)" }}
                      onClick={() => setFamilyMode("choose")}>
                      ← Voltar
                    </button>
                  </div>
                )}

                {familyMode === "join" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid hsl(var(--accent) / 0.2)"
                      }}>
                      <div className="flex items-center gap-3 mb-3">
                        <KeyRound className="h-5 w-5" style={{ color: "hsl(var(--accent-light))" }} />
                        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Entrar em uma família</h3>
                      </div>
                      <input
                        placeholder="Código de 8 caracteres"
                        value={codigoConvite}
                        onChange={(e) => setCodigoConvite(e.target.value.toUpperCase().slice(0, 8))}
                        disabled={loading}
                        maxLength={8}
                        className="w-full rounded-lg px-3.5 py-2.5 text-[13px] tracking-widest text-center font-mono transition-all duration-200 outline-none placeholder:opacity-40"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid hsl(var(--accent) / 0.2)",
                          color: "hsl(var(--foreground))"
                        }} />
                    </div>
                    <button
                      onClick={handleJoinFamily}
                      disabled={loading || codigoConvite.trim().length !== 8}
                      className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                        color: "hsl(var(--accent-foreground))",
                        boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
                      }}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🔑 Entrar na Família"}
                    </button>
                    <button
                      className="w-full text-xs mt-1 transition-colors duration-200 hover:underline"
                      style={{ color: "hsl(var(--foreground) / 0.5)" }}
                      onClick={() => setFamilyMode("choose")}>
                      ← Voltar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div key="step3" className={`text-center ${animationClass}`}>
              <div className="mb-5">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full animate-[fadeInScale_400ms_ease-out_both]"
                  style={{ background: "hsl(var(--accent) / 0.15)", border: "2px solid hsl(var(--accent) / 0.4)" }}>
                  <Crown className="h-8 w-8" style={{ color: "hsl(var(--accent-light))" }} />
                </div>
                <h1
                  className="font-display text-[30px] sm:text-[36px] lg:text-[44px] font-bold leading-tight tracking-[2px] mb-1.5 animate-[fadeInUp_300ms_ease-out_80ms_both]"
                  style={{ color: "hsl(var(--accent-light))" }}>
                  Seu Reino foi Fundado! 👑
                </h1>
                <p
                  className="text-[13px] sm:text-sm animate-[fadeInUp_300ms_ease-out_160ms_both]"
                  style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                  14 dias gratuitos ativados
                </p>
              </div>

              {/* Trial badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-[20px] mx-auto animate-[fadeInUp_300ms_ease-out_240ms_both]"
                style={{
                  border: "1px solid hsl(var(--accent) / 0.4)",
                  background: "transparent",
                  color: "hsl(var(--accent-light))",
                }}>
                <span className="text-xs font-semibold">TRIAL ATIVO · até {formatTrialDate()}</span>
              </div>

              {/* Features list */}
              <div className="space-y-2.5 text-left max-w-[300px] mx-auto mt-5 animate-[fadeInUp_300ms_ease-out_320ms_both]">
                {[
                  "Análise inteligente de gastos com IA",
                  "Metas financeiras em família",
                  "Reflexões e sabedoria bíblica diária",
                  "Gamificação e conquistas familiares",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--accent-light))" }} />
                    <span className="text-[13px]" style={{ color: "hsl(var(--foreground) / 0.85)" }}>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 mt-5">
                <button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="w-full rounded-lg h-10 text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)"
                  }}>
                  ✨ Explorar o App
                </button>
                <button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="text-xs font-medium transition-colors duration-200 hover:underline"
                  style={{ color: "hsl(var(--accent-light))" }}>
                  Assinar agora — US$ 9,90/mês
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
