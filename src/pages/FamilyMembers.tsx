import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getNomeNivel } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface Membro {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
  pontos_total: number;
  nivel_gamificacao: number;
}

export default function FamilyMembers() {
  const { user } = useAuth();
  const { profile, familia, buscarPerfil, buscarFamilia } = useProfile();
  const { toast } = useToast();
  const [membros, setMembros] = useState<Membro[]>([]);

  useEffect(() => { if (user) buscarPerfil(user.id); }, [user, buscarPerfil]);
  useEffect(() => {
    if (profile?.familia_id) {
      buscarFamilia(profile.familia_id);
      supabase.from("profiles").select("id, nome_completo, avatar_url, pontos_total, nivel_gamificacao")
        .eq("familia_id", profile.familia_id)
        .then(({ data }) => { if (data) setMembros(data as Membro[]); });
    }
  }, [profile?.familia_id, buscarFamilia]);

  const copiar = () => {
    if (familia?.codigo_convite) {
      navigator.clipboard.writeText(familia.codigo_convite);
      toast({ title: "📋 Código copiado!" });
    }
  };

  const compartilharWhatsApp = () => {
    if (familia?.codigo_convite) {
      const msg = encodeURIComponent(`Junte-se à nossa família no Legacy Kingdom! 👑\nCódigo: ${familia.codigo_convite}`);
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Membros da Família</h1>

        {familia?.codigo_convite && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Código da Família</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <span className="text-xl font-mono font-bold text-primary tracking-widest">{familia.codigo_convite}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copiar}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
                <Button variant="outline" size="sm" onClick={compartilharWhatsApp}><Share2 className="h-4 w-4 mr-1" /> WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {membros.map((m) => {
            const { nome, emoji } = getNomeNivel(m.nivel_gamificacao ?? 1);
            return (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : m.nome_completo?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{emoji} Nível {m.nivel_gamificacao} — {nome}</p>
                  </div>
                  <span className="text-xs text-primary font-semibold">{m.pontos_total ?? 0} pts</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
