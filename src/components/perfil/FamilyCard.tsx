import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FamilyCardProps {
  nome: string;
  plano: string | null;
  dataFimTrial: string | null;
  codigoConvite: string | null;
}

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function FamilyCard({ nome, plano, dataFimTrial, codigoConvite }: FamilyCardProps) {
  const { toast } = useToast();
  const dias = diasRestantes(dataFimTrial);
  const isPremium = plano === "premium";

  const copiarCodigo = () => {
    if (!codigoConvite) return;
    const url = `${window.location.origin}/join-family?code=${codigoConvite}`;
    navigator.clipboard.writeText(url);
    toast({ title: "📋 Link copiado!" });
  };

  const compartilhar = () => {
    if (!codigoConvite) return;
    const msg =
      `👑 Junte-se à minha família no Crown & Legacy!\n\n` +
      `Use o código: *${codigoConvite}*\n\n` +
      `Acesse: ${window.location.origin}\n\n` +
      `Gerencie suas finanças com sabedoria bíblica! 📖`;

    if (navigator.share) {
      navigator.share({ title: "Crown & Legacy - Convite", text: msg, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(msg);
      toast({ title: "📋 Convite copiado!" });
    }
  };

  return (
    <Card className="card-glass-gold">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Minha Família</CardTitle>
          <Badge variant={isPremium ? "default" : "secondary"} className={isPremium ? "gradient-gold text-primary-foreground" : ""}>
            {isPremium ? "PREMIUM" : "TRIAL"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-semibold text-foreground">{nome}</p>

        {!isPremium && dias !== null && (
          <p className="text-xs text-muted-foreground">
            ⏳ {dias} {dias === 1 ? "dia restante" : "dias restantes"} no trial
          </p>
        )}

        {codigoConvite && (
          <>
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3">
              <span className="text-lg font-mono font-bold text-primary tracking-widest flex-1">{codigoConvite}</span>
              <Button variant="outline" size="sm" onClick={copiarCodigo}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <button
              onClick={compartilhar}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 gradient-gold text-primary-foreground"
            >
              <Share2 className="h-4 w-4" /> Compartilhar Convite
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
