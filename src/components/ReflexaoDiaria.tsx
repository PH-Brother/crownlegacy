import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVersiculoAleatorio } from "@/lib/versiculos";

export default function ReflexaoDiaria() {
  const [verso, setVerso] = useState({ versiculo: "", referencia: "" });

  const renovar = () => setVerso(getVersiculoAleatorio());

  useEffect(() => { renovar(); }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-primary/20 pl-6 pr-5 py-6 bg-card"
      style={{
        borderLeft: "3px solid hsl(var(--primary))",
      }}
    >
      {/* Decorative opening quote */}
      <span
        className="absolute select-none pointer-events-none text-primary/30"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "4rem",
          lineHeight: 1,
          top: "0.25rem",
          left: "0.75rem",
        }}
        aria-hidden="true"
      >
        {"\u201C"}
      </span>

      <p
        className="text-foreground"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "1.15rem",
          fontStyle: "italic",
          fontWeight: 500,
          lineHeight: 1.8,
          letterSpacing: "0.01em",
          marginTop: "1rem",
        }}
      >
        {verso.versiculo}
      </p>

      <p
        className="mt-2 text-primary"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        — {verso.referencia}
      </p>

      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-auto p-0 text-primary hover:bg-transparent hover:text-primary/80"
        style={{ fontSize: "0.8rem" }}
        onClick={renovar}
      >
        <RefreshCw className="h-3 w-3 mr-1" /> Nova reflexão
      </Button>
    </div>
  );
}