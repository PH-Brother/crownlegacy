import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Home, KeyRound, Check, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

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
    // Pre-fill name from metadata
    const metaName = user.user_metadata?.nome_completo;
    if (metaName) setNome(metaName);
  }, [user, authLoading, navigate]);

  // Redirect if user already has family
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
    if (!user) return;
    setLoading(true);
    try {
      // Create family directly (no RPC)
      const codigoConvite = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: familia, error: familiaError } = await supabase
        .from("familias")
        .insert({
          nome: trimmed,
          plano: "trial",
          data_fim_trial: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          codigo_convite: codigoConvite,
        })
        .select()
        .single();
      if (familiaError) throw familiaError;

      // Link user to family
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ familia_id: familia.id, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setTrialEndDate(familia.data_fim_trial);
      goToStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar família";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    const code = codigoConvite.trim().toUpperCase();
    if (code.length !== 8) {
      toast({ title: "Código deve ter 8 caracteres", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_family_with_code", {
        p_codigo_convite: code,
      });
      if (error) {
        if (error.message.includes("Invalid family code")) {
          toast({ title: "Código inválido. Verifique e tente novamente.", variant: "destructive" });
        } else {
          toast({ title: error.message, variant: "destructive" });
        }
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.id) {
        const { data: fam } = await supabase
          .from("familias")
          .select("data_fim_trial")
          .eq("id", row.id)
          .maybeSingle();
        setTrialEndDate(fam?.data_fim_trial ?? null);
      }
      goToStep(3);
    } catch (err: unknown) {
      toast({ title: "Erro ao entrar na família", variant: "destructive" });
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <img src={logo} alt="Legacy Kingdom" className="w-20 h-20 rounded-2xl animate-shield-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="mx-auto max-w-[430px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Etapa {step} de 3</span>
            <img src={logo} alt="Legacy Kingdom" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(212,175,55,0.2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressValue}%`,
                background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[430px]">
          {/* STEP 1 */}
          {step === 1 && (
            <div key="step1" className={`space-y-6 ${animationClass}`}>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-primary font-display">Bem-vindo ao seu Reino</h1>
                <p className="text-sm text-muted-foreground mt-1">Vamos começar conhecendo você</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Nome completo *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="min-h-[48px] input-premium"
                    disabled={loading}
                    maxLength={100}
                  />
                  {nome.length > 0 && nome.trim().length < 2 && (
                    <p className="text-xs text-destructive">Mínimo 2 caracteres</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Telefone</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="min-h-[48px] input-premium"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Data de nascimento</Label>
                  <Input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="min-h-[48px] input-premium"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Seu papel na família</Label>
                  <Select value={role} onValueChange={setRole} disabled={loading}>
                    <SelectTrigger className="min-h-[48px] input-premium">
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

              <Button
                onClick={handleStep1}
                className="w-full min-h-[48px] btn-premium text-base"
                disabled={loading || nome.trim().length < 2}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Próximo →"}
              </Button>

              <p className="text-center text-xs italic" style={{ color: "#D4AF37" }}>
                Provérbios 21:5 — "Os planos do diligente levam à abundância"
              </p>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div key="step2" className={`space-y-6 ${animationClass}`}>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-primary font-display">Funde seu Reino</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie as finanças em família</p>
              </div>

              {familyMode === "choose" && (
                <div className="space-y-4">
                  {/* Create family card */}
                  <div
                    className="card-premium p-5 cursor-pointer hover:border-primary transition-colors"
                    style={{ borderColor: "rgba(212,175,55,0.3)" }}
                    onClick={() => setFamilyMode("create")}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Crown className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Criar minha família</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Comece do zero e convide seus familiares</p>
                  </div>

                  {/* Join family card */}
                  <div
                    className="card-premium p-5 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setFamilyMode("join")}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <KeyRound className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Entrar em uma família</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Tenho um código de convite</p>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => goToStep(1)}
                  >
                    ← Voltar
                  </Button>
                </div>
              )}

              {familyMode === "create" && (
                <div className="space-y-4">
                  <div className="card-premium p-5" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <Crown className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Criar minha família</h3>
                    </div>
                    <Input
                      placeholder="Nome da família (ex: Família Silva)"
                      value={nomeFamilia}
                      onChange={(e) => setNomeFamilia(e.target.value.slice(0, 50))}
                      className="min-h-[48px] input-premium"
                      disabled={loading}
                      maxLength={50}
                    />
                    {nomeFamilia.trim().length > 0 && nomeFamilia.trim().length < 2 && (
                      <p className="text-xs text-destructive mt-1">Mínimo 2 caracteres</p>
                    )}
                  </div>
                  <Button
                    onClick={handleCreateFamily}
                    className="w-full min-h-[48px] btn-premium text-base"
                    disabled={loading || nomeFamilia.trim().length < 2}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🏠 Criar Família"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setFamilyMode("choose")}
                  >
                    ← Voltar
                  </Button>
                </div>
              )}

              {familyMode === "join" && (
                <div className="space-y-4">
                  <div className="card-premium p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <KeyRound className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">Entrar em uma família</h3>
                    </div>
                    <Input
                      placeholder="Código de 8 caracteres"
                      value={codigoConvite}
                      onChange={(e) => setCodigoConvite(e.target.value.toUpperCase().slice(0, 8))}
                      className="min-h-[48px] input-premium tracking-widest text-center font-mono text-lg"
                      disabled={loading}
                      maxLength={8}
                    />
                  </div>
                  <Button
                    onClick={handleJoinFamily}
                    className="w-full min-h-[48px] btn-premium text-base"
                    disabled={loading || codigoConvite.trim().length !== 8}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🔑 Entrar na Família"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setFamilyMode("choose")}
                  >
                    ← Voltar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div key="step3" className={`space-y-8 text-center ${animationClass}`}>
              <div>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full animate-shield-pulse"
                  style={{ background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.4)" }}>
                  <Crown className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-primary font-display">Seu Reino foi Fundado! 👑</h1>
                <p className="text-sm text-muted-foreground mt-2">14 dias gratuitos ativados</p>
              </div>

              {/* Trial badge */}
              <div className="inline-flex items-center px-5 py-2 rounded-[20px] mx-auto"
                style={{
                  border: "1px solid rgba(212,175,55,0.4)",
                  background: "transparent",
                  color: "#D4AF37",
                }}>
                <span className="text-sm font-semibold">TRIAL ATIVO · até {formatTrialDate()}</span>
              </div>

              {/* Features list */}
              <div className="space-y-3 text-left max-w-[320px] mx-auto">
                {[
                  "Análise inteligente de gastos com IA",
                  "Metas financeiras em família",
                  "Reflexões e sabedoria bíblica diária",
                  "Gamificação e conquistas familiares",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="w-full min-h-[48px] btn-premium text-base"
                >
                  ✨ Explorar o App
                </Button>
                <button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="text-sm font-medium"
                  style={{ color: "#D4AF37" }}
                >
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
