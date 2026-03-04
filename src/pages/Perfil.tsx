import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GamificacaoBar from "@/components/GamificacaoBar";
import BottomNav from "@/components/BottomNav";
import ProfileAvatar from "@/components/perfil/ProfileAvatar";
import ProfileForm from "@/components/perfil/ProfileForm";
import FamilyCard from "@/components/perfil/FamilyCard";
import ProfileSkeleton from "@/components/perfil/ProfileSkeleton";

const ROLE_LABELS: Record<string, string> = {
  pai: "👨 Pai",
  mae: "👩 Mãe",
  filho: "👦 Filho",
  filha: "👧 Filha",
  membro: "👤 Membro",
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        {loading ? (
          <ProfileSkeleton />
        ) : profile && user ? (
          <>
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold text-foreground">Meu Perfil</h1>
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[profile.role || ""] || "👤 Membro"}
              </Badge>
            </div>

            <ProfileAvatar
              avatarUrl={profile.avatar_url}
              nome={profile.nome_completo}
              userId={user.id}
              onAvatarUpdated={(url) => setProfile((prev) => prev ? { ...prev, avatar_url: url } : null)}
            />

            <GamificacaoBar pontos={profile.pontos_total ?? 0} nivel={profile.nivel_gamificacao ?? 1} />

            <ProfileForm
              userId={user.id}
              nomeInicial={profile.nome_completo || ""}
              telefoneInicial={profile.telefone || ""}
              dataNascInicial={profile.data_nascimento || ""}
              roleInicial={profile.role || "pai"}
              email={user.email || ""}
            />

            {familia && (
              <FamilyCard
                nome={familia.nome}
                plano={familia.plano}
                dataFimTrial={familia.data_fim_trial}
                codigoConvite={familia.codigo_convite}
              />
            )}

            {/* Assinatura */}
            <Card className="card-glass">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Minha Assinatura</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Plano: {familia?.plano || "Trial"}</p>
                <Button variant="link" className="text-primary p-0 h-auto text-sm" onClick={() => navigate("/assinatura")}>
                  Gerenciar →
                </Button>
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
