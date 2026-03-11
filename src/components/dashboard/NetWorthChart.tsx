import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate, formatCurrency, formatCompactCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import type { NetWorthSnapshot } from "@/hooks/useNetWorth";

interface Props {
  data: NetWorthSnapshot[];
  height?: number;
}

interface ChartDataPoint {
  date: string;
  label: string;
  netWorth: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isNegative = d.netWorth < 0;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{d.label}</p>
      <p className={`text-sm font-bold ${isNegative ? "text-destructive" : "text-primary"}`}>
        {formatCurrency(d.netWorth)}
      </p>
      {isNegative && <p className="text-[10px] text-destructive">Patrimônio negativo</p>}
    </div>
  );
}

export default function NetWorthChart({ data, height = 280 }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Seu histórico aparecerá aqui após o primeiro cadastro de ativos
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.map((s) => ({
    date: s.snapshot_date,
    label: formatDate(s.snapshot_date),
    netWorth: s.net_worth ?? s.total_assets - s.total_liabilities,
  }));

  const hasNegative = chartData.some((d) => d.netWorth < 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={hasNegative ? "hsl(0,84%,60%)" : "hsl(43,56%,52%)"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={hasNegative ? "hsl(0,84%,60%)" : "hsl(43,56%,52%)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(39,14%,56%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(39,14%,56%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v)}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="netWorth"
          stroke={hasNegative ? "hsl(0,84%,60%)" : "hsl(43,56%,52%)"}
          strokeWidth={2}
          fill="url(#nwGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function NetWorthChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}
