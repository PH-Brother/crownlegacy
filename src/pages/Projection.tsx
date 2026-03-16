import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calculator, Loader2, Check, X } from "lucide-react";

interface Scenario {
  name: string;
  rate: number;
  finalValue: number;
  totalGain: number;
  yearlyBreakdown: { year: number; value: number }[];
}

interface ChartPoint {
  year: number;
  conservative: number;
  moderate: number;
  aggressive: number;
}

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 0 })}`;
}

export default function ProjectionPage() {
  const { toast } = useToast();
  const [netWorth, setNetWorth] = useState("");
  const [monthly, setMonthly] = useState("");
  const [returnRate, setReturnRate] = useState("8");
  const [years, setYears] = useState("10");
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  const nwValid = Number(netWorth) > 0;
  const moValid = Number(monthly) >= 0 && monthly !== "";
  const rrValid = Number(returnRate) >= 0 && Number(returnRate) <= 30 && returnRate !== "";
  const yrValid = Number(years) >= 1 && Number(years) <= 50 && years !== "";
  const allValid = nwValid && moValid && rrValid && yrValid;

  const calculate = () => {
    if (!allValid) return;
    setLoading(true);
    try {
      const pv = Number(netWorth);
      const pmt = Number(monthly);
      const yr = Number(years);

      const calcScenario = (name: string, rate: number) => {
        const r = rate / 100;
        const yearlyBreakdown: { year: number; value: number }[] = [];
        let current = pv;
        yearlyBreakdown.push({ year: 0, value: Math.round(current) });
        for (let y = 1; y <= yr; y++) {
          current = current * (1 + r) + pmt * 12;
          yearlyBreakdown.push({ year: y, value: Math.round(current) });
        }
        return {
          name,
          rate,
          finalValue: Math.round(current),
          totalGain: Math.round(current - pv),
          yearlyBreakdown,
        };
      };

      const s = [
        calcScenario("Conservador", 5),
        calcScenario("Moderado", Number(returnRate)),
        calcScenario("Agressivo", 12),
      ];

      const points: ChartPoint[] = [];
      for (let y = 0; y <= yr; y++) {
        points.push({
          year: y,
          conservative: s[0].yearlyBreakdown[y].value,
          moderate: s[1].yearlyBreakdown[y].value,
          aggressive: s[2].yearlyBreakdown[y].value,
        });
      }

      setScenarios(s);
      setChartData(points);
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const Validation = ({ valid }: { valid: boolean }) =>
    valid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive/50" />;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[900px] px-4 py-4 space-y-5">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Projeção de Riqueza
          </h1>
          <p className="text-sm text-muted-foreground">Simule o crescimento do seu patrimônio ao longo do tempo</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Inputs */}
          <Card className="card-premium lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent" /> Parâmetros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  Patrimônio Atual (R$) <Validation valid={nwValid} />
                </Label>
                <Input
                  type="number"
                  placeholder="ex: 50000"
                  value={netWorth}
                  onChange={(e) => setNetWorth(e.target.value)}
                  min={1}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  Economia Mensal (R$) <Validation valid={moValid} />
                </Label>
                <Input
                  type="number"
                  placeholder="ex: 2000"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  min={0}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  Retorno Anual (%) <Validation valid={rrValid} />
                </Label>
                <Input
                  type="number"
                  placeholder="ex: 8"
                  value={returnRate}
                  onChange={(e) => setReturnRate(e.target.value)}
                  min={0}
                  max={30}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  Período (anos) <Validation valid={yrValid} />
                </Label>
                <Input
                  type="number"
                  placeholder="ex: 10"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  min={1}
                  max={50}
                  className="h-11"
                />
              </div>
              <Button
                onClick={calculate}
                disabled={!allValid || loading}
                className="btn-premium w-full gap-2 min-h-[48px]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Calcular Projeção
              </Button>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="card-premium lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Gráfico de Projeção</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="year"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Anos", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        color: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatBRL(value), ""]}
                      labelFormatter={(label: number) => `Ano ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="conservative" name="Conservador (5%)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="moderate" name="Moderado (8%)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="aggressive" name="Agressivo (12%)" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                  Preencha os parâmetros e clique em "Calcular" para ver a projeção
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {scenarios && scenarios.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scenarios.map((s) => {
                const colors: Record<string, string> = {
                  Conservador: "border-red-500/20 bg-red-500/5",
                  Moderado: "border-blue-500/20 bg-blue-500/5",
                  Agressivo: "border-green-500/20 bg-green-500/5",
                };
                const textColors: Record<string, string> = {
                  Conservador: "text-red-400",
                  Moderado: "text-blue-400",
                  Agressivo: "text-green-400",
                };
                return (
                  <Card key={s.name} className={`border ${colors[s.name] || ""}`}>
                    <CardContent className="p-4 text-center space-y-1">
                      <p className={`text-sm font-semibold ${textColors[s.name] || ""}`}>{s.name} ({s.rate}%)</p>
                      <p className="text-xl font-display font-bold text-foreground">{formatBRL(s.finalValue)}</p>
                      <p className="text-xs text-muted-foreground">
                        Ganho: {formatBRL(s.totalGain)} (+{Math.round((s.totalGain / (s.finalValue - s.totalGain)) * 100)}%)
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="card-premium">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cenário</TableHead>
                      <TableHead className="text-xs text-right">Valor Final</TableHead>
                      <TableHead className="text-xs text-right">Ganho Total</TableHead>
                      <TableHead className="text-xs text-right">Retorno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((s) => (
                      <TableRow key={s.name} className={s.name === "Moderado" ? "bg-blue-500/5" : ""}>
                        <TableCell className="text-sm font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(s.finalValue)}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(s.totalGain)}</TableCell>
                        <TableCell className="text-sm text-right">{s.rate}% a.a.</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
