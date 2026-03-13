import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, RefreshCw, AlertTriangle, ShoppingBag, Utensils,
  Car, Zap, Film, MoreHorizontal, TrendingUp, Lightbulb, Heart, Loader2, Clock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SpendingPattern {
  category: string;
  total: number;
  percentage: number;
  trend: string;
  insight: string;
}

interface Alert {
  type: string;
  category: string;
  amount: number;
  message: string;
}

interface Recommendation {
  text: string;
  potential_savings: number;
  category: string;
}

interface InsightData {
  patterns: SpendingPattern[];
  alerts: Alert[];
  recommendations: Recommendation[];
  health_score: number;
  health_message: string;
  generated_at: string;
  expires_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Shopping: <ShoppingBag className="h-5 w-5" />,
  Food: <Utensils className="h-5 w-5" />,
  Transport: <Car className="h-5 w-5" />,
  Utilities: <Zap className="h-5 w-5" />,
  Entertainment: <Film className="h-5 w-5" />,
  Other: <MoreHorizontal className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  Shopping: "text-blue-400",
  Food: "text-green-400",
  Transport: "text-orange-400",
  Utilities: "text-purple-400",
  Entertainment: "text-pink-400",
  Other: "text-muted-foreground",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "menos de 1 hora";
  if (hours === 1) return "1 hora";
  if (hours < 24) return `${hours} horas`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

function getHealthEmoji(score: number): string {
  if (score >= 76) return "😄";
  if (score >= 51) return "😊";
  if (score >= 26) return "😐";
  return "😞";
}

export default function FinancialInsightsPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cached, setCached] = useState(false);

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    if (!user?.id || !session?.access_token) return;
    forceRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("generate-financial-insights", {
        body: { forceRefresh },
      });
      if (error) throw error;
      if (result?.success) {
        setData(result.data);
        setCached(result.cached || false);
      } else {
        throw new Error(result?.error || "Erro desconhecido");
      }
    } catch (err) {
      toast({ title: "Erro ao carregar insights", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, session?.access_token, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[700px] px-4 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" /> Análise Financeira
            </h1>
            {data?.generated_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                Atualizado há {timeAgo(data.generated_at)}
                {cached && <span className="text-accent"> (cache)</span>}
              </p>
            )}
          </div>
          <Button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            size="sm"
            className="btn-premium gap-1.5 min-h-[44px]"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !data || (data.patterns.length === 0 && data.alerts.length === 0) ? (
          <Card className="card-premium">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma transação encontrada nos últimos 30 dias.</p>
              <p className="text-xs text-muted-foreground mt-1">Faça upload de um extrato ou adicione transações para ver insights.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Health Score */}
            <Card className="card-premium overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{getHealthEmoji(data.health_score)}</div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-display font-bold text-foreground">{data.health_score}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{data.health_message}</p>
                    <Progress value={data.health_score} className="mt-2 h-2" />
                  </div>
                  <Heart className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>

            {/* Spending Patterns */}
            {data.patterns.length > 0 && (
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" /> Padrões de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.patterns.map((p) => (
                      <div key={p.category} className="rounded-xl bg-muted/50 p-3 space-y-1">
                        <div className={`flex items-center gap-1.5 ${categoryColors[p.category] || "text-muted-foreground"}`}>
                          {categoryIcons[p.category] || <MoreHorizontal className="h-5 w-5" />}
                          <span className="text-xs font-medium truncate">{p.category}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          R$ {p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{p.percentage}% do total</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts */}
            {data.alerts.length > 0 && (
              <Card className="card-premium border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {data.alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{a.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          R$ {a.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-accent" /> Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {data.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                      <Lightbulb className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{r.text}</p>
                        <p className="text-xs text-accent mt-1">
                          💰 Economia potencial: R$ {r.potential_savings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
