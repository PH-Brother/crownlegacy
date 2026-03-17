import { useState, useEffect, useCallback } from "react";
import { Copy, Share2, ExternalLink, BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface ShareEvent {
  id: string;
  share_type: string;
  platform: string;
  shared_at: string;
  click_count: number;
}

interface ReferralLink {
  id: string;
  referral_code: string;
  clicks: number;
  conversions: number;
  created_at: string;
}

function isValidReferralCode(code: string): boolean {
  return /^CL-[A-Z0-9]{6,16}$/.test(code);
}

export default function Share() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [shares, setShares] = useState<ShareEvent[]>([]);
  const [referral, setReferral] = useState<ReferralLink | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [shRes, rfRes] = await Promise.all([
      supabase.from("share_events").select("*").eq("user_id", user.id).order("shared_at", { ascending: false }).limit(20),
      supabase.from("referral_links").select("*").eq("referrer_id", user.id).limit(1),
    ]);
    if (shRes.data) setShares(shRes.data as ShareEvent[]);
    if (rfRes.data && rfRes.data.length > 0) {
      setReferral(rfRes.data[0] as ReferralLink);
    } else {
      // Create referral link
      const code = `CL-${user.id.substring(0, 8).toUpperCase()}`;
      const { data } = await supabase.from("referral_links").insert({
        referrer_id: user.id,
        referral_code: code,
      }).select().single();
      if (data) setReferral(data as ReferralLink);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const referralUrl = referral ? `${baseUrl}/auth?tab=signup&ref=${referral.referral_code}` : "";

  const trackShare = async (shareType: string, platform: string) => {
    if (!user) return;
    await supabase.from("share_events").insert({
      user_id: user.id,
      share_type: shareType,
      platform,
    });
  };

  const shareText = (type: string) => {
    const name = profile?.nome_completo?.split(" ")[0] || "Eu";
    if (type === "score")
      return `${name} está construindo patrimônio com o Crown & Legacy — o app de inteligência financeira para famílias! 🏆 Teste grátis por 14 dias:`;
    if (type === "challenge")
      return `${name} acabou de completar um desafio financeiro no Crown & Legacy! 🔥 Aceita o desafio também?`;
    return `${name} projetou seu patrimônio no Crown & Legacy e os números são incríveis! 📈 Simule o seu:`;
  };

  const handleShare = async (type: string, platform: string) => {
    const text = shareText(type);
    const url = referralUrl;

    await trackShare(type, platform);

    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "link") {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copiado! 📋", description: "Cole em qualquer lugar" });
      } catch {
        toast({ title: "Erro ao copiar", variant: "destructive" });
      }
    } else if (platform === "native" && navigator.share) {
      try {
        await navigator.share({ title: "Crown & Legacy", text, url });
      } catch { /* cancelled */ }
    }

    fetchData();
  };

  const totalClicks = referral?.clicks || 0;
  const totalConversions = referral?.conversions || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[520px] px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  const ShareButtons = ({ type }: { type: string }) => (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="border-success/30 text-success text-xs h-9" onClick={() => handleShare(type, "whatsapp")}>
        WhatsApp
      </Button>
      <Button variant="outline" className="border-primary/30 text-primary text-xs h-9" onClick={() => handleShare(type, "twitter")}>
        Twitter / X
      </Button>
      <Button variant="outline" className="border-[hsl(var(--accent))]/30 text-accent text-xs h-9" onClick={() => handleShare(type, "linkedin")}>
        LinkedIn
      </Button>
      <Button variant="outline" className="border-muted-foreground/30 text-foreground text-xs h-9" onClick={() => handleShare(type, "link")}>
        <Copy className="h-3 w-3 mr-1" /> Copiar Link
      </Button>
    </div>
  );

  const ShareableCard = ({ type, title, value, subtitle }: { type: string; title: string; value: string; subtitle: string }) => (
    <div className="rounded-xl p-5 flex flex-col items-center border border-accent/30 bg-gradient-to-br from-card to-primary/5">
      <img src="/lovable-uploads/d14cf31d-f436-42e2-ab61-e86927359604.png" alt="Logo" className="w-12 h-12 rounded-xl mb-3" />
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-mono font-bold text-accent mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <p className="text-[10px] text-muted-foreground/50 mt-3">Crown & Legacy · Wealth Intelligence</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-foreground font-display">Compartilhar</h1>

        {/* Seção de Incentivo */}
        <Card className="card-premium border-accent/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎁</span>
              <div>
                <p className="text-sm font-bold text-foreground">Programa de Indicação</p>
                <p className="text-xs text-muted-foreground">Indique amigos e ganhe recompensas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ background: "hsl(var(--accent) / 0.08)", border: "1px solid hsl(var(--accent) / 0.2)" }}>
                <p className="text-xl font-mono font-bold text-accent">30 dias</p>
                <p className="text-[10px] text-muted-foreground font-medium">Premium grátis</p>
                <p className="text-[10px] text-muted-foreground">para você</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                <p className="text-xl font-mono font-bold text-primary">14 dias</p>
                <p className="text-[10px] text-muted-foreground font-medium">trial estendido</p>
                <p className="text-[10px] text-muted-foreground">para o indicado</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A cada amigo que criar conta usando seu link e permanecer ativo por 7 dias, você ganha{" "}
              <span className="text-accent font-semibold">30 dias grátis</span> no Crown & Legacy Premium. Sem limite de indicações. 👑
            </p>
          </CardContent>
        </Card>

        {/* Tracking Overview */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="card-premium">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-foreground">{totalClicks}</p>
              <p className="text-[10px] text-muted-foreground">Cliques</p>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-success">{totalConversions}</p>
              <p className="text-[10px] text-muted-foreground">Conversões</p>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-accent">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        {referral && (
          <Card className="card-premium border-accent/20">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Seu Link de Referral</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted/50 rounded-md px-3 py-2 text-foreground truncate font-mono">
                  {referralUrl}
                </code>
                <Button size="sm" variant="outline" className="border-accent/30 text-accent h-8" onClick={() => handleShare("score", "link")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Tabs */}
        <Tabs defaultValue="score">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="score">Score</TabsTrigger>
            <TabsTrigger value="challenge">Desafio</TabsTrigger>
            <TabsTrigger value="projection">Projeção</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4 mt-4">
            <ShareableCard type="score" title="Meu Score Financeiro" value="🎯" subtitle="Você consegue mais?" />
            <ShareButtons type="score" />
          </TabsContent>

          <TabsContent value="challenge" className="space-y-4 mt-4">
            <ShareableCard type="challenge" title="Desafio Completado" value="🔥" subtitle="Aceita o desafio?" />
            <ShareButtons type="challenge" />
          </TabsContent>

          <TabsContent value="projection" className="space-y-4 mt-4">
            <ShareableCard type="projection" title="Minha Projeção" value="📈" subtitle="Simule seu crescimento" />
            <ShareButtons type="projection" />
          </TabsContent>
        </Tabs>

        {/* Share History */}
        {shares.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico</h2>
            {shares.map((s) => (
              <Card key={s.id} className="card-premium">
                <CardContent className="p-3 flex items-center gap-3">
                  <Share2 className="h-4 w-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground capitalize">{s.share_type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.platform} · {new Date(s.shared_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{s.click_count} cliques</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
