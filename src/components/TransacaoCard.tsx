import { formatarMoeda, formatarData } from "@/lib/utils";
import type { Transacao } from "@/hooks/useTransacoes";

const EMOJIS_CAT: Record<string, string> = {
  "Alimentação": "🍽️", "Transporte": "🚗", "Saúde": "❤️", "Educação": "📚",
  "Lazer": "🎉", "Moradia": "🏠", "Salário": "💰", "Freelance": "💻",
  "Investimentos": "📈", "Dízimo/Oferta": "🙏", "Roupas": "👕",
  "Presente": "🎁", "Outros": "📦", "Compras": "🛒",
};

interface Props {
  transacao: Transacao;
  onDelete?: (id: string) => void;
}

export default function TransacaoCard({ transacao, onDelete }: Props) {
  const isReceita = transacao.tipo === "receita";
  const emoji = EMOJIS_CAT[transacao.categoria] || "📦";

  return (
    <div
      className="flex items-center gap-3 rounded-lg card-glass p-3"
      onClick={() => onDelete?.(transacao.id)}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
        isReceita ? "bg-success/15" : "bg-destructive/15"
      }`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{transacao.categoria}</p>
        {transacao.descricao && (
          <p className="truncate text-xs text-muted-foreground">{transacao.descricao}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isReceita ? "text-success" : "text-destructive"}`}>
          {isReceita ? "+" : "-"}{formatarMoeda(Number(transacao.valor))}
        </p>
        <p className="text-xs text-muted-foreground">{formatarData(transacao.data_transacao)}</p>
      </div>
    </div>
  );
}
