import {
  ShoppingCart, Home, Car, Heart, GraduationCap, Gamepad2,
  Shirt, Church, Briefcase, Gift, TrendingUp, MoreHorizontal,
  Utensils, Wallet
} from "lucide-react";
import { formatarMoeda, formatarData } from "@/lib/utils";
import type { Transacao } from "@/hooks/useTransacoes";

const iconesPorCategoria: Record<string, React.ElementType> = {
  "Alimentação": Utensils,
  "Moradia": Home,
  "Transporte": Car,
  "Saúde": Heart,
  "Educação": GraduationCap,
  "Lazer": Gamepad2,
  "Roupas": Shirt,
  "Dízimo/Oferta": Church,
  "Salário": Briefcase,
  "Freelance": Wallet,
  "Investimentos": TrendingUp,
  "Presente": Gift,
  "Outros": MoreHorizontal,
  "Compras": ShoppingCart,
};

interface Props {
  transacao: Transacao;
  onDelete?: (id: string) => void;
}

export default function TransacaoCard({ transacao, onDelete }: Props) {
  const Icon = iconesPorCategoria[transacao.categoria] || MoreHorizontal;
  const isReceita = transacao.tipo === "receita";

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      onClick={() => onDelete?.(transacao.id)}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
        isReceita ? "bg-success/20" : "bg-destructive/20"
      }`}>
        <Icon className={`h-5 w-5 ${isReceita ? "text-success" : "text-destructive"}`} />
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
