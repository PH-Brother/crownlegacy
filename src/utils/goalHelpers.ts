export function calculateDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getGoalStatus(targetDate: string): "active" | "upcoming" | "overdue" {
  const days = calculateDaysRemaining(targetDate);
  if (days < 0) return "overdue";
  if (days < 30) return "upcoming";
  return "active";
}

export function getGoalProgressColor(percentage: number): string {
  if (percentage >= 75) return "hsl(var(--success, 142 71% 45%))";
  if (percentage >= 50) return "hsl(48 96% 53%)";
  if (percentage >= 25) return "hsl(25 95% 53%)";
  return "hsl(var(--destructive))";
}

export function getGoalTypeIcon(type: string): string {
  const map: Record<string, string> = {
    emergencia: "Shield",
    aposentadoria: "Sunset",
    imovel: "Home",
    veiculo: "Car",
    educacao: "GraduationCap",
    viagem: "Plane",
    legado: "Crown",
    negocio: "Briefcase",
    outro: "Target",
  };
  return map[type] || "Target";
}

export function calculateGoalProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export const GOAL_TYPES = [
  { value: "emergencia", label: "Emergência" },
  { value: "aposentadoria", label: "Aposentadoria" },
  { value: "imovel", label: "Imóvel" },
  { value: "veiculo", label: "Veículo" },
  { value: "educacao", label: "Educação" },
  { value: "viagem", label: "Viagem" },
  { value: "legado", label: "Legado" },
  { value: "negocio", label: "Negócio" },
  { value: "outro", label: "Outro" },
] as const;

export const GOAL_PRIORITIES = [
  { value: 1, label: "Alta", color: "hsl(var(--destructive))" },
  { value: 2, label: "Média", color: "hsl(48 96% 53%)" },
  { value: 3, label: "Baixa", color: "hsl(var(--success, 142 71% 45%))" },
] as const;
