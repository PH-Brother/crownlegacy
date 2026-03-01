import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data + "T00:00:00") : data;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - d.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `${dias} dias atrás`;
  return d.toLocaleDateString("pt-BR");
}

export function gerarCodigo8(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function calcularProgresso(pontos: number, nivel: number): number {
  const faixas = [0, 500, 1000, 2000, 4000, Infinity];
  const min = faixas[nivel - 1] || 0;
  const max = faixas[nivel] || Infinity;
  if (max === Infinity) return 100;
  return Math.min(100, Math.round(((pontos - min) / (max - min)) * 100));
}

export function getNomeNivel(nivel: number): { nome: string; emoji: string } {
  const niveis: Record<number, { nome: string; emoji: string }> = {
    1: { nome: "Iniciante", emoji: "🌱" },
    2: { nome: "Aprendiz", emoji: "📚" },
    3: { nome: "Guardião", emoji: "🛡️" },
    4: { nome: "Sábio", emoji: "🦉" },
    5: { nome: "Mestre Financeiro", emoji: "👑" },
  };
  return niveis[nivel] || niveis[1];
}

export const CATEGORIAS_RECEITA = [
  "Salário", "Freelance", "Investimentos", "Presente", "Outros"
];

export const CATEGORIAS_DESPESA = [
  "Alimentação", "Moradia", "Transporte", "Saúde", "Educação",
  "Lazer", "Roupas", "Dízimo/Oferta", "Outros"
];
