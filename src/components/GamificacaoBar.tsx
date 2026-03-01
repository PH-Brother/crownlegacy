import { Progress } from "@/components/ui/progress";
import { calcularProgresso, getNomeNivel } from "@/lib/utils";

interface Props {
  pontos: number;
  nivel: number;
}

export default function GamificacaoBar({ pontos, nivel }: Props) {
  const { nome, emoji } = getNomeNivel(nivel);
  const progresso = calcularProgresso(pontos, nivel);
  const faixas = [0, 500, 1000, 2000, 4000, Infinity];
  const proximoNivel = faixas[nivel] ?? 0;
  const pontosParaProximo = proximoNivel === Infinity ? "MAX" : `${pontos}/${proximoNivel}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-primary">
          {emoji} Nível {nivel} — {nome}
        </span>
        <span className="text-muted-foreground text-xs">{pontosParaProximo} pts</span>
      </div>
      <Progress value={progresso} className="h-2 [&>div]:bg-primary" />
    </div>
  );
}
