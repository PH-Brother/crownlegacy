import { formatarMoeda } from "@/lib/utils";
import { formatarData } from "@/utils/formatters";
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
  onEdit?: (transacao: Transacao) => void;
}

export default function TransacaoCard({ transacao, onDelete, onEdit }: Props) {
  const isReceita = transacao.tipo === "receita";
  const emoji = EMOJIS_CAT[transacao.categoria] || "📦";

  return (
    <div className="flex items-center gap-3 rounded-lg card-glass p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
        isReceita ? "bg-success/15" : "bg-destructive/15"
      }`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {transacao.descricao || transacao.categoria}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {transacao.categoria} • {formatarData(transacao.data_transacao)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={`text-sm font-bold ${isReceita ? "text-success" : "text-destructive"}`}>
            {isReceita ? "+" : "-"}{formatarMoeda(Number(transacao.valor))}
          </p>
        </div>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(transacao); }}
            className="text-xs px-1.5 py-1 rounded hover:bg-primary/10 transition-colors"
            style={{ color: "#D4AF37" }}
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(transacao.id); }}
            className="text-xs px-1.5 py-1 rounded hover:bg-destructive/10 transition-colors"
            style={{ color: "#ef4444" }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
