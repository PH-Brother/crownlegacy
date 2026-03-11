import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, User, Target, CheckCircle, ChevronLeft, Loader2, Camera } from "lucide-react";
import confetti from "canvas-confetti";

const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const GOAL_OPTIONS = [
  { id: "emergencias", label: "Economizar para emergências", type: "savings" },
  { id: "aposentadoria", label: "Investir para aposentadoria", type: "retirement" },
  { id: "imovel", label: "Comprar imóvel", type: "property" },
  { id: "educacao", label: "Educação dos filhos", type: "education" },
  { id: "viagem", label: "Viagem dos sonhos", type: "travel" },
  { id: "negocio", label: "Negócio próprio", type: "business" },
  { id: "outro", label: "Outro", type: "other" },
] as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function hashColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 35%)`;
}

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 2 fields
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 fields
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Confetti fired flag
  const confettiFired = useRef(false);

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

  // Fire confetti on step 4
  useEffect(() => {
    if (currentStep === 3 && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#F0D58A", "#E8C547", "#10b981", "#D4AF37"],
      });
    }
  }, [currentStep]);

  const validateDateOfBirth = (dateStr: string): string | null => {
    if (!dateStr) return null; // optional
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Data inválida";
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate()) ? age - 1 : age;
    if (date > now) return "Data não pode ser futura";
    if (actualAge < 18) return "Idade mínima: 18 anos";
    if (actualAge > 120) return "Data inválida";
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = ACCEPTED_TYPES[file.type];
    if (!ext) {
      toast({ title: "Formato não suportado. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande (máx 5MB)", variant: "destructive" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: signedData, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;

      setAvatarUrl(signedData.signedUrl);
      toast({ title: "📸 Foto enviada!" });
    } catch {
      setAvatarPreview(null);
      toast({ title: "Erro no upload da foto", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (nome.trim().length < 3) {
      toast({ title: "Nome deve ter no mínimo 3 caracteres", variant: "destructive" });
      return;
    }
    if (nome.trim().length > 100) {
      toast({ title: "Nome deve ter no máximo 100 caracteres", variant: "destructive" });
      return;
    }

    const dateError = validateDateOfBirth(dataNascimento);
    if (dateError) {
      toast({ title: dateError, variant: "destructive" });
      return;
    }

    if (!user) return;
    setLoading(true);
    try {
      const updateData: Record<string, string | null> = { nome_completo: nome.trim() };
      if (dataNascimento) updateData.data_nascimento = dataNascimento;
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
      if (error) throw error;
      setCurrentStep(2);
    } catch {
      toast({ title: "Erro ao salvar perfil. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    if (selectedGoals.size === 0) {
      toast({ title: "Selecione pelo menos um objetivo", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const goalsToInsert = Array.from(selectedGoals).map((goalId) => {
        const goal = GOAL_OPTIONS.find((g) => g.id === goalId)!;
        return {
          user_id: user.id,
          title: goal.label,
          type: goal.type,
          target_value: 0,
          status: "active",
        };
      });

      const { error } = await supabase.from("wealth_goals").insert(goalsToInsert);
      if (error) throw error;
      setCurrentStep(3);
    } catch {
      toast({ title: "Erro ao salvar objetivos. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    // Check if user has familia_id, if not redirect to family setup
    navigate("/onboarding-family", { replace: true });
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const progressWidth = ((currentStep + 1) / 4) * 100;

  const displayUrl = avatarPreview || avatarUrl;
  const initials = getInitials(nome || "?");
  const avatarBg = user ? hashColor(user.id) : "#555";

  if (authLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-dark)) 100%)" }}
      >
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "hsl(var(--accent-light))" }} />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 sm:px-6"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary-dark)) 100%)" }}
    >
      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)" }}
      />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-[3px]" style={{ background: "rgba(240, 213, 138, 0.2)" }}>
        <div
          className="h-full transition-all duration-300 ease-in-out"
          style={{ width: `${progressWidth}%`, background: "linear-gradient(to right, hsl(var(--accent-light)), hsl(var(--accent)))" }}
        />
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          className="fixed top-4 left-4 z-10 p-2 rounded-full transition-colors duration-200 hover:bg-white/10"
          style={{ color: "hsl(var(--success))" }}
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Card container */}
      <div
        className="relative z-[1] w-full max-w-[500px] sm:max-w-[450px] lg:max-w-[500px] rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center my-8"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(240, 213, 138, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* ═══ STEP 0: Welcome ═══ */}
        {currentStep === 0 && (
          <div className="flex flex-col items-center text-center w-full">
            <Crown
              className="animate-[fadeInScale_300ms_ease-out_both] mb-6"
              style={{ color: "hsl(var(--accent-light))" }}
              size={48}
            />
            <h1
              className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold leading-tight tracking-[2px] mb-2 animate-[fadeInUp_300ms_ease-out_100ms_both]"
              style={{ color: "hsl(var(--accent-light))" }}
            >
              Bem-vindo ao Crown &amp; Legacy
            </h1>
            <p
              className="text-sm mb-8 animate-[fadeInUp_300ms_ease-out_200ms_both]"
              style={{ color: "hsl(var(--foreground) / 0.85)" }}
            >
              Vamos configurar sua conta em 4 passos simples
            </p>
            <button
              onClick={() => setCurrentStep(1)}
              className="w-full rounded-lg h-10 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 animate-[fadeInUp_300ms_ease-out_300ms_both]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)",
              }}
            >
              Começar
            </button>
          </div>
        )}

        {/* ═══ STEP 1: Profile ═══ */}
        {currentStep === 1 && (
          <div className="flex flex-col items-center w-full animate-[fadeInUp_300ms_ease-out_both]">
            <User className="mb-6" style={{ color: "hsl(var(--accent-light))" }} size={48} />
            <h1
              className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold leading-tight tracking-[2px] mb-6 text-center"
              style={{ color: "hsl(var(--accent-light))" }}
            >
              Complete seu Perfil
            </h1>

            <div className="flex flex-col gap-4 w-full">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="João da Silva"
                  maxLength={100}
                  disabled={loading}
                  className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid hsl(var(--accent) / 0.2)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                {nome.length > 0 && nome.trim().length < 3 && (
                  <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>Mínimo 3 caracteres</p>
                )}
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg px-3.5 py-2.5 text-[13px] transition-all duration-200 outline-none placeholder:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid hsl(var(--accent) / 0.2)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                {dataNascimento && validateDateOfBirth(dataNascimento) && (
                  <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
                    {validateDateOfBirth(dataNascimento)}
                  </p>
                )}
              </div>

              {/* Foto de Perfil */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden group transition-transform hover:scale-105 shrink-0"
                    style={{
                      background: displayUrl ? undefined : avatarBg,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {displayUrl ? (
                      <img src={displayUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                      <Camera className="h-5 w-5" style={{ color: "hsl(var(--accent-light))" }} />
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--accent-light))" }} />
                      </div>
                    )}
                  </button>
                  <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                    JPG, PNG ou WebP. Máx 5MB.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-8">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 rounded-lg h-10 text-sm font-medium transition-all duration-200 hover:bg-white/10"
                style={{
                  background: "transparent",
                  border: "1px solid hsl(var(--accent) / 0.3)",
                  color: "hsl(var(--accent-light))",
                }}
              >
                Pular
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading || nome.trim().length < 3 || uploading}
                className="flex-1 rounded-lg h-10 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)",
                }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Próximo"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Financial Goals ═══ */}
        {currentStep === 2 && (
          <div className="flex flex-col items-center w-full animate-[fadeInUp_300ms_ease-out_both]">
            <Target className="mb-6" style={{ color: "hsl(var(--accent-light))" }} size={48} />
            <h1
              className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold leading-tight tracking-[2px] mb-2 text-center"
              style={{ color: "hsl(var(--accent-light))" }}
            >
              Seus Objetivos Financeiros
            </h1>
            <p className="text-sm mb-6 text-center" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
              Selecione pelo menos um objetivo
            </p>

            <div className="flex flex-col gap-3 w-full">
              {GOAL_OPTIONS.map((goal) => {
                const isChecked = selectedGoals.has(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-left"
                    style={{
                      background: isChecked ? "rgba(240, 213, 138, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${isChecked ? "hsl(var(--accent-light))" : "hsl(var(--accent) / 0.2)"}`,
                    }}
                  >
                    <div
                      className="h-5 w-5 rounded shrink-0 flex items-center justify-center transition-all duration-200"
                      style={{
                        background: isChecked ? "hsl(var(--accent-light))" : "transparent",
                        border: `2px solid ${isChecked ? "hsl(var(--accent-light))" : "hsl(var(--accent) / 0.4)"}`,
                      }}
                    >
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="hsl(var(--accent-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
                      {goal.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-8">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 rounded-lg h-10 text-sm font-medium transition-all duration-200 hover:bg-white/10"
                style={{
                  background: "transparent",
                  border: "1px solid hsl(var(--accent) / 0.3)",
                  color: "hsl(var(--accent-light))",
                }}
              >
                Pular
              </button>
              <button
                onClick={handleSaveGoals}
                disabled={loading || selectedGoals.size === 0}
                className="flex-1 rounded-lg h-10 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)",
                }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Próximo"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Confirmation ═══ */}
        {currentStep === 3 && (
          <div className="flex flex-col items-center text-center w-full animate-[fadeInUp_300ms_ease-out_both]">
            <CheckCircle
              className="mb-6 animate-[fadeInScale_300ms_ease-out_both]"
              style={{ color: "hsl(var(--success))" }}
              size={48}
            />
            <h1
              className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold leading-tight tracking-[2px] mb-2 animate-[fadeInUp_300ms_ease-out_100ms_both]"
              style={{ color: "hsl(var(--success))" }}
            >
              Tudo Pronto!
            </h1>
            <p
              className="text-sm mb-6 animate-[fadeInUp_300ms_ease-out_200ms_both]"
              style={{ color: "hsl(var(--foreground) / 0.85)" }}
            >
              Sua conta foi configurada com sucesso
            </p>

            {/* Summary */}
            <div
              className="w-full rounded-lg p-4 flex flex-col gap-3 mb-6 animate-[fadeInUp_300ms_ease-out_300ms_both] text-left"
              style={{ background: "rgba(255, 255, 255, 0.05)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.5)" }}>Nome:</span>
                <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
                  {nome.trim() || "Não informado"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.5)" }}>Objetivos:</span>
                <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
                  {selectedGoals.size > 0 ? `${selectedGoals.size} selecionado(s)` : "Nenhum selecionado"}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full rounded-lg h-10 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 animate-[fadeInUp_300ms_ease-out_400ms_both]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--accent-light)), hsl(var(--accent)))",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 4px 16px hsl(var(--accent) / 0.3)",
              }}
            >
              Configurar Família →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
