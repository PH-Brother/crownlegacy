import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import GamificacaoBar from "@/components/GamificacaoBar";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export default function Perfil() {
  const { user, signOut } = useAuth();
  const { profile, familia, buscarPerfil, buscarFamilia, atualizarPerfil } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) buscarPerfil(user.id);
  }, [user, buscarPerfil]);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome_completo || "");
      setTelefone(profile.telefone || "");
      if (profile.familia_id) buscarFamilia(profile.familia_id);
    }
  }, [profile, buscarFamilia]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await atualizarPerfil({ nome_completo: nome, telefone });
      toast({ title: "✅ Perfil atualizado!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await atualizarPerfil({ avatar_url: data.publicUrl });
      toast({ title: "📸 Avatar atualizado!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro no upload", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const copiarCodigo = () => {
    if (familia?.codigo_convite) {
      navigator.clipboard.writeText(familia.codigo_convite);
      toast({ title: "📋 Código copiado!" });
    }
  };

  const formatTelefone = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-5">
        <h1 className="text-lg font-bold text-foreground">Meu Perfil</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer relative">
            <div className="h-20 w-20 rounded-full gradient-gold flex items-center justify-center text-3xl text-primary-foreground font-bold overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                profile?.nome_completo?.[0]?.toUpperCase() || "?"
              )}
            </div>
            {avatarUploading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </label>
          <p className="text-xs text-muted-foreground">Toque para alterar foto</p>
        </div>

        <GamificacaoBar pontos={profile?.pontos_total ?? 0} nivel={profile?.nivel_gamificacao ?? 1} />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="min-h-[48px]" disabled={salvando} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="min-h-[48px] opacity-50" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(XX) XXXXX-XXXX"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              className="min-h-[48px]"
              disabled={salvando}
            />
          </div>
        </div>

        <Button onClick={handleSalvar} disabled={salvando} className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold">
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
        </Button>

        {/* Código */}
        {familia?.codigo_convite && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Meu Código de Família</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-primary tracking-widest flex-1">{familia.codigo_convite}</span>
              <Button variant="outline" size="sm" onClick={copiarCodigo}><Copy className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Minha Assinatura</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Plano: {familia?.plano || "Trial"}</p></CardContent>
        </Card>

        <Button variant="outline" onClick={handleLogout} className="w-full min-h-[48px] border-destructive/30 text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
