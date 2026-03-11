import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useAIInsights, type AIBehaviorInsight } from "@/hooks/useAIInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import InsightCard from "@/components/InsightCard";

type FilterTab = "todos" | "nao_lidos" | "lidos" | "avisos" | "positivos";

export default function Insights() {
  const { insights, loading, error, isGenerating, generateNewInsights, markAsRead, deleteInsight, refetch } = useAIInsights();
  const [tab, setTab] = useState<FilterTab>("todos");
  const [selectedInsight, setSelectedInsight] = useState<AIBehaviorInsight | null>(null);

  const filtered = insights.filter((i) => {
    switch (tab) {
      case "nao_lidos": return !i.is_read;
      case "lidos": return i.is_read;
      case "avisos": return i.severity === "warning" || i.severity === "critical";
      case "positivos": return i.severity === "positive" || i.severity === "info";
      default: return true;
    }
  });

  return (
    <div className="mx-auto max-w-[600px] px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Seus Insights
          </h1>
          <p className="text-sm text-muted-foreground">Análise inteligente de seus padrões financeiros</p>
        </div>
        <Button
          onClick={generateNewInsights}
          disabled={isGenerating}
          className="btn-premium gap-1.5 min-h-[44px]"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Gerar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive flex-1">Erro ao carregar insights</p>
            <Button size="sm" variant="outline" onClick={refetch}><RefreshCw className="h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList className="w-full overflow-x-auto flex justify-start bg-muted/50 h-auto p-1">
          <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="nao_lidos" className="text-xs">Não lidos</TabsTrigger>
          <TabsTrigger value="lidos" className="text-xs">Lidos</TabsTrigger>
          <TabsTrigger value="avisos" className="text-xs">Avisos</TabsTrigger>
          <TabsTrigger value="positivos" className="text-xs">Positivos</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="card-premium">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {insights.length === 0 ? "Nenhum insight gerado ainda" : "Nenhum insight nesta categoria"}
            </p>
            {insights.length === 0 && (
              <Button onClick={generateNewInsights} disabled={isGenerating} className="btn-premium gap-1.5">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar insights agora
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onMarkAsRead={markAsRead}
              onDelete={deleteInsight}
              onClick={() => setSelectedInsight(insight)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!selectedInsight} onOpenChange={(o) => !o && setSelectedInsight(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Insight</DialogTitle>
          </DialogHeader>
          {selectedInsight && (
            <InsightCard
              insight={selectedInsight}
              expanded
              onMarkAsRead={markAsRead}
              onDelete={(id) => { deleteInsight(id); setSelectedInsight(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
