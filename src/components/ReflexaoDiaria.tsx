import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVersiculoAleatorio } from "@/lib/versiculos";

export default function ReflexaoDiaria() {
  const [verso, setVerso] = useState({ versiculo: "", referencia: "" });

  const renovar = () => setVerso(getVersiculoAleatorio());

  useEffect(() => { renovar(); }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📖</span>
        <h3 className="text-sm font-semibold text-primary">Reflexão do Dia</h3>
      </div>
      <p className="italic text-sm text-foreground/90 mb-1">"{verso.versiculo}"</p>
      <p className="text-xs font-semibold text-primary mb-2">— {verso.referencia}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground"
        onClick={renovar}
      >
        <RefreshCw className="h-3 w-3 mr-1" /> Nova reflexão
      </Button>
    </div>
  );
}
