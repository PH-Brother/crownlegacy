import { useState, useEffect } from "react";
import { Edit3, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import FamilyWealth from "./FamilyWealth";
import FamilyNetwork from "./FamilyNetwork";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MinhaFamilia() {
  const [tab, setTab] = useState<"patrimonio" | "rede">("patrimonio");
  const { user } = useAuth();
  const { toast } = useToast();

  const [nomeFamilia, setNomeFamilia] = useState("");
  const [editandoNome, setEditandoNome] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [familiaId, setFamiliaId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id, role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.familia_id) return;
      setFamiliaId(profile.familia_id);
      setIsAdmin(profile.role === "pai" || profile.role === "admin");

      const { data: fam } = await supabase
        .from("familias")
        .select("nome")
        .eq("id", profile.familia_id)
        .maybeSingle();
      if (fam) setNomeFamilia(fam.nome);
    })();
  }, [user]);

  const salvarNomeFamilia = async () => {
    if (!nomeFamilia.trim() || !familiaId) return;
    setSalvandoNome(true);
    try {
      const { error } = await supabase
        .from("familias")
        .update({ nome: nomeFamilia.trim() })
        .eq("id", familiaId);
      if (error) throw error;
      setEditandoNome(false);
      toast({ title: "✅ Nome da família atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar nome", variant: "destructive" });
    } finally {
      setSalvandoNome(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-6 space-y-5">
        {/* Header editável */}
        <div className="flex items-center gap-2">
          {editandoNome ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={nomeFamilia}
                onChange={(e) => setNomeFamilia(e.target.value)}
                className="flex-1 bg-input border border-border rounded-xl px-4 py-2 text-lg font-bold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Nome da família"
                maxLength={50}
                disabled={salvandoNome}
                autoFocus
              />
              <button
                onClick={salvarNomeFamilia}
                disabled={salvandoNome}
                className="p-2 hover:bg-primary/10 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Check className="h-5 w-5 text-primary" />
              </button>
              <button
                onClick={() => setEditandoNome(false)}
                disabled={salvandoNome}
                className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground font-display flex-1">
                {nomeFamilia || "Minha Família"}
              </h1>
              {isAdmin && (
                <button
                  onClick={() => setEditandoNome(true)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Editar nome da família"
                >
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </>
          )}
        </div>

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
