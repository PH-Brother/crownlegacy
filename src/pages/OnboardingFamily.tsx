import { useState } from "react";

function isValidReferralCode(code: string): boolean {
  return /^CL-[A-Z0-9]{6,16}$/.test(code);
}
import logo from "@/assets/logo-CL-Verde-dourado-Gold-claro.png";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Loader2, Home, KeyRound } from "lucide-react";

export default function OnboardingFamily() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modo, setModo] = useState<"escolha" | "criar">("escolha");
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCriar = async () => {
    const trimmed = nomeFamilia.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      toast({ title: "❌ Nome da família deve ter entre 2 e 50 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado");

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const codigoConvite = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");

      // Step 1: Insert família — só captura o id
      const { data: familiaInsert, error: familiaError } = await supabase.
      from("familias").
      insert({
        nome: trimmed,
        plano: "trial",
        data_fim_trial: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        codigo_convite: codigoConvite
      }).
      select("id").
      single();
      if (familiaError) throw familiaError;
      if (!familiaInsert) throw new Error("Falha ao criar família");

      // Step 2: Vincular usuário à família
      const { error: profileError } = await supabase.
      from("profiles").
      update({ familia_id: familiaInsert.id, updated_at: new Date().toISOString() }).
      eq("id", authUser.id);
      if (profileError) throw profileError;

      // Step 3: Agora sim buscar dados completos (RLS já permite após vínculo)
      const { data: familiaCompleta, error: errSelect } = await supabase.
      from("familias").
      select("id, nome, codigo_convite, data_fim_trial").
      eq("id", familiaInsert.id).
      single();
      if (errSelect) console.warn("Select família:", errSelect);

      toast({ title: "🏠 Família criada com sucesso!" });
      navigate("/dashboard", { replace: true });

      // Process referral bonus
      try {
        const refCode = localStorage.getItem("cl_ref_code");
        if (refCode && isValidReferralCode(refCode)) {
          const { data: refLink } = await supabase
            .from("referral_links")
            .select("id, referrer_id, conversions")
            .eq("referral_code", refCode)
            .maybeSingle();

          if (refLink) {
            await supabase
              .from("referral_links")
              .update({ conversions: (refLink.conversions || 0) + 1 })
              .eq("id", refLink.id);

            const { data: referrerProfile } = await supabase
              .from("profiles")
              .select("familia_id")
              .eq("id", refLink.referrer_id)
              .maybeSingle();

            if (referrerProfile?.familia_id) {
              const { data: familiaRef } = await supabase
                .from("familias")
                .select("data_fim_trial")
                .eq("id", referrerProfile.familia_id)
                .maybeSingle();

              if (familiaRef) {
                const baseDate = familiaRef.data_fim_trial
                  ? new Date(Math.max(new Date(familiaRef.data_fim_trial).getTime(), Date.now()))
                  : new Date();
                baseDate.setDate(baseDate.getDate() + 30);

                await supabase
                  .from("familias")
                  .update({ data_fim_trial: baseDate.toISOString() })
                  .eq("id", referrerProfile.familia_id);
              }
            }

            localStorage.removeItem("cl_ref_code");
            toast({
              title: "🎁 Conta criada via indicação!",
              description: "Seu amigo ganhou 30 dias grátis no Crown & Legacy.",
            });
          }
        }
      } catch (refErr) {
        console.warn("Erro ao processar referral:", refErr);
      }
    } catch (err) {
      toast({ title: "Erro ao criar família. Tente novamente.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <img alt="Crown & Legacy" className="w-24 h-24 mx-auto mb-4 drop-shadow-[0_0_24px_rgba(212,175,55,0.4)] object-cover" src="/lovable-uploads/79cd20ce-04dc-4622-b50f-e259ffe43ff6.png" />
          <h1 className="mt-2 text-xl font-bold text-primary">Bem-vindo ao Crown & Legacy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.user_metadata?.nome_completo ? `Olá, ${user.user_metadata.nome_completo.split(" ")[0]}! ` : ""}
            Como deseja começar?
          </p>
        </div>

        {modo === "escolha" ?
        <div className="space-y-4">
            <Card
            className="cursor-pointer card-glass-gold hover:border-primary transition-colors"
            onClick={() => setModo("criar")}>
            
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Home className="h-5 w-5 text-primary" /> Criar minha família
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comece do zero e convide seus familiares
                </p>
              </CardContent>
            </Card>

            <Card
            className="cursor-pointer card-glass hover:border-primary transition-colors"
            onClick={() => navigate("/join-family")}>
            
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5 text-primary" /> Entrar com código
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tenho um código de convite da minha família
                </p>
              </CardContent>
            </Card>
          </div> :

        <div className="space-y-4">
            <Input
            placeholder="Nome da família (ex: Família Silva)"
            value={nomeFamilia}
            onChange={(e) => setNomeFamilia(e.target.value.slice(0, 50))}
            className="min-h-[48px] input-premium"
            disabled={loading}
            maxLength={50} />
          
            {nomeFamilia.trim().length > 0 && nomeFamilia.trim().length < 2 &&
          <p className="text-xs text-destructive">Mínimo 2 caracteres</p>
          }
            <Button
            onClick={handleCriar}
            className="w-full min-h-[48px] gradient-gold text-primary-foreground font-bold"
            disabled={loading || !nomeFamilia.trim()}>
            
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🏠 Criar Família"}
            </Button>
            <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setModo("escolha")}>
            
              ← Voltar
            </Button>
          </div>
        }
      </div>
    </div>);

}