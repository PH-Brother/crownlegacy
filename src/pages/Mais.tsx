import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Target, FileText, Users, Share2, Flame, Crown, User, Settings, ChevronRight, MessageCircle, BarChart3 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import AppLayout from "@/components/AppLayout";

const sections = [
  {
    label: "Inteligência IA",
    items: [
      { icon: Sparkles, label: "Insights", desc: "Análise inteligente dos seus padrões", path: "/insights", badge: "insights", gold: false },
      { icon: MessageCircle, label: "Copilot IA", desc: "Chat com seu assistente financeiro", path: "/copilot", gold: false },
      { icon: BarChart3, label: "Análise IA", desc: "Relatório detalhado de gastos", path: "/financial-insights", gold: false },
    ],
  },
  {
    label: "Patrimônio",
    items: [
      { icon: TrendingUp, label: "Projeção de Riqueza", desc: "Simule seu futuro financeiro", path: "/projection", gold: false },
      { icon: Target, label: "Metas", desc: "Acompanhe seus objetivos", path: "/goals", gold: false },
      { icon: FileText, label: "Documentos", desc: "Cofre digital de comprovantes e faturas", path: "/documents", gold: false },
    ],
  },
  {
    label: "Família",
    items: [
      { icon: Users, label: "Minha Família", desc: "Patrimônio, rede e metas familiares", path: "/minha-familia", badge: "invites", gold: false },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { icon: Flame, label: "Desafios", desc: "Ganhe pontos e badges", path: "/challenges", gold: false },
      { icon: Share2, label: "Compartilhar", desc: "Indique e ganhe", path: "/share", gold: false },
    ],
  },
  {
    label: "Conta",
    items: [
      { icon: Crown, label: "Planos", desc: "Gerencie sua assinatura", path: "/planos", gold: true },
      { icon: User, label: "Perfil", desc: "Suas informações", path: "/perfil", gold: false },
      { icon: Settings, label: "Configurações", desc: "Preferências do app", path: "/configuracoes", gold: false },
    ],
  },
];

export default function Mais() {
  const navigate = useNavigate();
  const { unreadInsightsCount, pendingInvitesCount } = useNotifications();

  const getBadge = (key?: string) => {
    if (key === "insights") return unreadInsightsCount;
    if (key === "invites") return pendingInvitesCount;
    return 0;
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-4 space-y-6 pb-24">
        <h1 className="text-xl font-display font-bold text-foreground">Explorar</h1>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.label} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const badge = getBadge((item as any).badge);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] text-left"
                      style={{
                        background: item.gold
                          ? "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.05))"
                          : "hsl(var(--card))",
                        border: item.gold
                          ? "1px solid hsl(var(--accent) / 0.3)"
                          : "1px solid hsl(var(--border))",
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: item.gold ? "hsl(var(--accent) / 0.15)" : "hsl(var(--primary) / 0.1)",
                        }}
                      >
                        <item.icon
                          className="h-5 w-5"
                          style={{ color: item.gold ? "hsl(var(--accent))" : "hsl(var(--primary-light))" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      {badge > 0 && (
                        <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
