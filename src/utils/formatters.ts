export const formatCurrency = (value: number, currency: string = "BRL"): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${String(d.getDate()).padStart(2, "0")}/${meses[d.getMonth()]}`;
};

export const formatarData = (data: string | null | undefined): string => {
  if (!data) return "—";
  if (data.includes("/")) return data;
  const partes = data.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return data;
};

export const mesParaDate = (mesAno: string | null | undefined): string | null => {
  if (!mesAno) return null;
  const p = mesAno.split("/");
  if (p.length !== 2) return null;
  return `${p[1]}-${p[0].padStart(2, "0")}-01`;
};

export const calculateVariation = (
  current: number,
  previous: number
): { value: number; percentage: number; isPositive: boolean } => {
  const value = current - previous;
  const percentage = previous !== 0 ? (value / Math.abs(previous)) * 100 : current !== 0 ? 100 : 0;
  return { value, percentage, isPositive: value >= 0 };
};

export const formatCompactCurrency = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};
