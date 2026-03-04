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
      className="relative overflow-hidden rounded-xl border border-primary/20 pl-6 pr-5 py-6"
      style={{
        background: "#1a1a2e",
        borderLeft: "3px solid hsl(43 56% 52%)",
      }}
    >
      {/* Decorative opening quote */}
      <span
        className="absolute select-none pointer-events-none"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "4rem",
          lineHeight: 1,
          color: "hsl(43 56% 52%)",
          opacity: 0.3,
          top: "0.25rem",
          left: "0.75rem",
        }}
        aria-hidden="true"
      >
        {"\u201C"}
      </span>

      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "1.15rem",
          fontStyle: "italic",
          fontWeight: 500,
          lineHeight: 1.8,
          letterSpacing: "0.01em",
          color: "#f5e6c8",
          marginTop: "1rem",
        }}
      >
        {verso.versiculo}
      </p>

      <p
        className="mt-2"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "hsl(43 56% 52%)",
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
