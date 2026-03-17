import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import FamilyWealth from "./FamilyWealth";
import FamilyNetwork from "./FamilyNetwork";

export default function MinhaFamilia() {
  const [tab, setTab] = useState<"patrimonio" | "rede">("patrimonio");

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-foreground font-display">Minha Família</h1>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-xl"
          style={{ background: "hsl(var(--muted))" }}
        >
          <button
            onClick={() => setTab("patrimonio")}
            className="rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background: tab === "patrimonio" ? "hsl(var(--card))" : "transparent",
              color: tab === "patrimonio" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === "patrimonio" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
            }}
          >
            👑 Patrimônio
          </button>
          <button
            onClick={() => setTab("rede")}
            className="rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background: tab === "rede" ? "hsl(var(--card))" : "transparent",
              color: tab === "rede" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === "rede" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
            }}
          >
            🤝 Rede & Metas
          </button>
        </div>

        {tab === "patrimonio" && (
          <div className="-mx-4 -mt-2">
            <FamilyWealth />
          </div>
        )}
        {tab === "rede" && (
          <div className="-mx-4 -mt-2">
            <FamilyNetwork />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
