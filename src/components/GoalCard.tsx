import { Shield, Sunset, Home, Car, GraduationCap, Plane, Crown, Briefcase, Target, Pencil, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/utils/formatters";
import { calculateGoalProgress, getGoalProgressColor, getGoalStatus, calculateDaysRemaining, GOAL_PRIORITIES } from "@/utils/goalHelpers";

const ICON_MAP: Record<string, React.ElementType> = {
  emergencia: Shield, aposentadoria: Sunset, imovel: Home, veiculo: Car,
  educacao: GraduationCap, viagem: Plane, legado: Crown, negocio: Briefcase, outro: Target,
};

interface GoalCardProps {
  goal: {
    id: string; title: string; description?: string | null; type: string;
    target_value: number; current_value: number; target_date: string;
    priority: number; status: string;
  };
  onEdit?: (id: string) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export default function GoalCard({ goal, onEdit, onComplete, onDelete, compact }: GoalCardProps) {
  const Icon = ICON_MAP[goal.type] || Target;
  const percent = calculateGoalProgress(goal.current_value, goal.target_value);
  const progressColor = getGoalProgressColor(percent);
  const status = getGoalStatus(goal.target_date);
  const daysLeft = calculateDaysRemaining(goal.target_date);
  const priority = GOAL_PRIORITIES.find((p) => p.value === goal.priority);

  return (
    <Card className="card-premium hover:border-primary/30 transition-colors">
      <CardContent className={compact ? "p-3 space-y-2" : "p-4 space-y-3"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{goal.title}</p>
              {!compact && goal.description && (
                <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
              )}
            </div>
          </div>
          {priority && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: `${priority.color}20`, color: priority.color }}>
              {priority.label}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{formatCurrency(goal.current_value)}</span>
            <span className="font-bold" style={{ color: progressColor }}>{percent.toFixed(0)}%</span>
            <span className="text-muted-foreground">{formatCurrency(goal.target_value)}</span>
          </div>
          <Progress value={percent} className="h-2" style={{ ["--progress-color" as string]: progressColor }} />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${status === "active" ? "text-success" : status === "upcoming" ? "text-warning" : "text-destructive"}`}>
            {status === "overdue" ? "Vencida" : status === "upcoming" ? `${daysLeft} dias restantes` : `Prazo: ${new Date(goal.target_date).toLocaleDateString("pt-BR")}`}
          </span>
          {goal.status !== "archived" && (
            <div className="flex gap-1">
              {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal.id)}><Pencil className="h-3 w-3" /></Button>}
              {onComplete && goal.status === "active" && <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => onComplete(goal.id)}><Check className="h-3 w-3" /></Button>}
              {onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal.id)}><Trash2 className="h-3 w-3" /></Button>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
