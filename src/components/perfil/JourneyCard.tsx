import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calcularProgresso, getNomeNivel } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface JourneyCardProps {
  pontos: number;
  nivel: number;
  userId: string;
  familiaId: string | null;
}

export default function JourneyCard({ pontos, nivel, userId, familiaId }: JourneyCardProps) {
  const [totalTx, setTotalTx] = useState(0);
  const { nome, emoji } = getNomeNivel(nivel);
  const progresso = calcularProgresso(pontos, nivel);
  const faixas = [0, 500, 1000, 2000, 4000, Infinity];
  const proximo = faixas[nivel] ?? Infinity;

  useEffect(() => {
    if (!familiaId) return;
    supabase
      .from("transacoes")
      .select("id", { count: "exact", head: true })
      .eq("familia_id", familiaId)
      .then(({ count }) => setTotalTx(count ?? 0));
  }, [familiaId]);

  return (
    <Card className="card-glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🏆 Minha Jornada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">
            {emoji} Nível {nivel} — {nome}
          </span>
          <span className="text-xs text-muted-foreground">
            {proximo === Infinity ? "MAX" : `${pontos}/${proximo}`} pts
          </span>
        </div>
        <Progress value={progresso} className="h-2 [&>div]:bg-primary" />
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-primary">{totalTx}</p>
            <p className="text-[10px] text-muted-foreground">Transações</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-primary">{pontos}</p>
            <p className="text-[10px] text-muted-foreground">Pontos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
