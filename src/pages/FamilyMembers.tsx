import { useEffect, useState } from "react";
import { getAppUrl } from "@/hooks/useAppUrl";
import { Copy, Share2, Trophy } from "lucide-react";
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
  role: string | null;
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
      supabase.from("profiles")
        .select("id, nome_completo, avatar_url, role, pontos_total, nivel_gamificacao")
        .eq("familia_id", profile.familia_id)
        .order("pontos_total", { ascending: false })
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
      const msg = encodeURIComponent(`Junte-se à nossa família no Crown & Legacy! 👑\nCódigo: ${familia.codigo_convite}\n${window.location.origin}/join-family`);
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-[430px] px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Membros da Família</h1>

        {familia?.codigo_convite && (
          <Card className="card-glass-gold">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Código de Convite</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <span className="text-xl font-mono font-bold text-primary tracking-widest block">{familia.codigo_convite}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copiar} className="border-primary/30"><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
                <Button variant="outline" size="sm" onClick={compartilharWhatsApp} className="border-primary/30"><Share2 className="h-4 w-4 mr-1" /> WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ranking */}
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Ranking da Família</h2>
        </div>

        <div className="space-y-2">
          {membros.map((m, idx) => {
            const { nome, emoji } = getNomeNivel(m.nivel_gamificacao ?? 1);
            return (
              <Card key={m.id} className="card-glass">
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="text-lg font-bold text-primary w-6 text-center">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                  <div className="h-10 w-10 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden flex-shrink-0">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : m.nome_completo?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{emoji} {nome} · {m.role || "membro"}</p>
                  </div>
                  <span className="text-xs text-primary font-semibold whitespace-nowrap">{m.pontos_total ?? 0} pts</span>
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
