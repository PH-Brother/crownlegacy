import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import ProfileAvatar from "@/components/perfil/ProfileAvatar";
import ProfileForm from "@/components/perfil/ProfileForm";
import FamilyCard from "@/components/perfil/FamilyCard";
import FamilyMembersList from "@/components/perfil/FamilyMembersList";
import JourneyCard from "@/components/perfil/JourneyCard";
import ProfileSkeleton from "@/components/perfil/ProfileSkeleton";

const ROLE_LABELS: Record<string, { label: string; emoji: string }> = {
  pai: { label: "Pai", emoji: "👑" },
  mae: { label: "Mãe", emoji: "👑" },
  filho: { label: "Filho", emoji: "🌱" },
  filha: { label: "Filha", emoji: "🌱" },
  membro: { label: "Membro", emoji: "👤" },
};

interface ProfileData {
  nome_completo: string;
  telefone: string | null;
  data_nascimento: string | null;
  role: string | null;
  avatar_url: string | null;
  familia_id: string | null;
  pontos_total: number | null;
  nivel_gamificacao: number | null;
}

interface FamiliaData {
  nome: string;
  plano: string | null;
  data_fim_trial: string | null;
  codigo_convite: string | null;
}

export default function Perfil() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [familia, setFamilia] = useState<FamiliaData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from("profiles")
        .select("nome_completo, telefone, data_nascimento, role, avatar_url, familia_id, pontos_total, nivel_gamificacao")
        .eq("id", user.id)
        .maybeSingle();
      if (!p) return;
      setProfile(p);
      if (p.familia_id) {
        const { data: f } = await supabase
          .from("familias")
          .select("nome, plano, data_fim_trial, codigo_convite")
          .eq("id", p.familia_id)
          .maybeSingle();
        if (f) setFamilia(f);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const roleInfo = ROLE_LABELS[profile?.role || ""] || ROLE_LABELS.membro;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        {/* Back button */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground font-display">Meu Perfil</h1>
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : profile && user ? (
          <>
            {/* Avatar + Name + Badge */}
            <div className="text-center space-y-2">
              <ProfileAvatar
                avatarUrl={profile.avatar_url}
                nome={profile.nome_completo}
                userId={user.id}
                onAvatarUpdated={(url) => setProfile((prev) => prev ? { ...prev, avatar_url: url } : null)}
              />
              <h2 className="text-lg font-semibold text-foreground font-display">{profile.nome_completo}</h2>
              <Badge variant="secondary" className="text-xs">
                {roleInfo.emoji} {roleInfo.label}
              </Badge>
            </div>

            {/* Form */}
            <ProfileForm
              userId={user.id}
              nomeInicial={profile.nome_completo || ""}
              telefoneInicial={profile.telefone || ""}
              dataNascInicial={profile.data_nascimento || ""}
              roleInicial={profile.role || "pai"}
              email={user.email || ""}
            />

            {/* Family Card */}
            {familia && profile.familia_id && (
              <div>
                <FamilyCard
                  nome={familia.nome}
                  plano={familia.plano}
                  dataFimTrial={familia.data_fim_trial}
                  codigoConvite={familia.codigo_convite}
                />
                <FamilyMembersList familiaId={profile.familia_id} />
              </div>
            )}

            {/* Appearance */}
            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🎨 Aparência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {/* Obsidian */}
                  <button
                    onClick={() => { setTheme("obsidian"); toast({ title: "Tema Obsidian ativado 🌑" }); }}
                    className={`rounded-xl p-3 text-center transition-all border-2 ${
                      theme === "obsidian" ? "ring-2 ring-amber-400 border-amber-400/50" : "border-border"
                    }`}
                    style={{ background: "#0a0a0f" }}
                  >
                    <div className="w-full h-8 rounded-lg mb-2" style={{ background: "#0a0a0f", border: "1px solid #d4af37" }} />
                    <span className="text-lg block">🌑</span>
                    <p className="text-xs font-semibold" style={{ color: "#f5f0e8" }}>Obsidian</p>
                    <p className="text-[10px]" style={{ color: "#9ca3af" }}>Escuro & Premium</p>
                  </button>
                  {/* Ivory */}
                  <button
                    onClick={() => { setTheme("ivory"); toast({ title: "Tema Ivory ativado ✨" }); }}
                    className={`rounded-xl p-3 text-center transition-all border-2 ${
                      theme === "ivory" ? "ring-2 ring-amber-600 border-amber-600/50" : "border-border"
                    }`}
                    style={{ background: "#faf7f2" }}
                  >
                    <div className="w-full h-8 rounded-lg mb-2" style={{ background: "#faf7f2", border: "1px solid #b8962e" }} />
                    <span className="text-lg block">☀️</span>
                    <p className="text-xs font-semibold" style={{ color: "#1a1a2e" }}>Ivory</p>
                    <p className="text-[10px]" style={{ color: "#6b7280" }}>Claro & Elegante</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Journey Card */}
            <JourneyCard
              pontos={profile.pontos_total ?? 0}
              nivel={profile.nivel_gamificacao ?? 1}
              userId={user.id}
              familiaId={profile.familia_id}
            />

            {/* Subscription */}
            <Card className="card-glass">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Minha Assinatura</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Plano: {familia?.plano || "Trial"}</p>
                <Button variant="link" className="text-primary p-0 h-auto text-sm" onClick={() => navigate("/assinatura")}>Gerenciar →</Button>
              </CardContent>
            </Card>

            {/* Logout */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full min-h-[48px] border-destructive/30 text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sair da Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
                  <AlertDialogDescription>Você precisará fazer login novamente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-destructive">Sair</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-10">Não foi possível carregar o perfil.</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
