import { Receipt, TrendingUp, AlertCircle, Target, BookOpen, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatters";
import type { AIBehaviorInsight } from "@/services/insightGenerator";

const TYPE_CONFIG: Record<string, { icon: typeof Receipt; label: string }> = {
  spending_pattern: { icon: Receipt, label: "Padrão de Gastos" },
  wealth_growth: { icon: TrendingUp, label: "Crescimento" },
  risk_warning: { icon: AlertCircle, label: "Risco" },
  discipline: { icon: Target, label: "Disciplina" },
  biblical_guidance: { icon: BookOpen, label: "Orientação Bíblica" },
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  positive: "bg-success/20 text-success border-success/30",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Info",
  warning: "Atenção",
  critical: "Crítico",
  positive: "Positivo",
};

interface InsightCardProps {
  insight: AIBehaviorInsight;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  expanded?: boolean;
  onClick?: () => void;
}

export default function InsightCard({ insight, onMarkAsRead, onDelete, expanded, onClick }: InsightCardProps) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.spending_pattern;
  const Icon = config.icon;
  const severityStyle = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
  const text = expanded ? insight.insight : insight.insight.length > 150 ? insight.insight.substring(0, 150) + "..." : insight.insight;

  return (
    <Card
      className="card-premium hover:border-primary/30 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{config.label}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${severityStyle}`}>
                {SEVERITY_LABELS[insight.severity]}
              </Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{text}</p>
            {insight.generated_at && (
              <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(insight.generated_at)}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
            {onMarkAsRead && !insight.is_read && insight.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAsRead(insight.id!); }}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                title="Marcar como lido"
              >
                <Check className="h-3.5 w-3.5 text-success" />
              </button>
            )}
            {onDelete && insight.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(insight.id!); }}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
