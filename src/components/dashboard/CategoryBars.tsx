import { useState } from "react";
import { formatarMoeda } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const CORES: Record<string, string> = {
  "Moradia": "#d4af37",
  "Alimentação": "#22c55e",
  "Transporte": "#3b82f6",
  "Saúde": "#f97316",
  "Educação": "#a855f7",
  "Lazer": "#ec4899",
  "Assinaturas": "#06b6d4",
  "Dízimo/Oferta": "#eab308",
  "Roupas": "#f472b6",
  "Outros": "#94a3b8",
};

const EMOJIS: Record<string, string> = {
  "Moradia": "🏠", "Alimentação": "🍽️", "Transporte": "🚗", "Saúde": "❤️",
  "Educação": "📚", "Lazer": "🎉", "Assinaturas": "📱", "Dízimo/Oferta": "🙏",
  "Roupas": "👕", "Outros": "📦",
};

interface CategoryBarsProps {
  categoriasMap: Record<string, number>;
}

export default function CategoryBars({ categoriasMap }: CategoryBarsProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = Object.entries(categoriasMap)
    .sort(([, a], [, b]) => b - a);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  const maxVal = sorted[0]?.[1] ?? 1;
  const visible = showAll ? sorted : sorted.slice(0, 6);

  return (
    <Card className="card-premium">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Gastos por Categoria</p>
        <div className="space-y-3">
          {visible.map(([name, value]) => {
            const pct = ((value / total) * 100).toFixed(0);
            const barWidth = (value / maxVal) * 100;
            const color = CORES[name] || "#94a3b8";
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span>{EMOJIS[name] || "📦"}</span>
                    <span className="font-medium">{name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{formatarMoeda(value)}</span>
                    <span className="text-muted-foreground text-[10px] w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length > 6 && (
          <button onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary mt-3 hover:underline">
            {showAll ? "Mostrar menos" : `Ver todas (${sorted.length})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
