import { useNavigate } from "react-router-dom";
import { TrendingUp, Target, FileText, Users, Share2, Flame, Crown, User, Settings, ChevronRight, Users2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import AppLayout from "@/components/AppLayout";

const sections = [
  {
    label: "Patrimônio",
    items: [
      { icon: TrendingUp, label: "Projeção de Riqueza", desc: "Simule seu futuro financeiro", path: "/projection", gold: false },
      { icon: Target, label: "Metas", desc: "Acompanhe seus objetivos", path: "/goals", gold: false },
      { icon: FileText, label: "Documentos", desc: "Cofre digital de ativos", path: "/documents", gold: false },
    ],
  },
  {
    label: "Família",
    items: [
      { icon: Users, label: "Gestão Familiar", desc: "Patrimônio da família", path: "/family-wealth", badge: "invites" as const, gold: false },
      { icon: Users2, label: "Rede Familiar", desc: "Conecte membros", path: "/family-network", gold: false },
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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function Mais() {
  const navigate = useNavigate();
  const { pendingInvitesCount } = useNotifications();

  return (
    <AppLayout>
      <div className="mx-auto max-w-[520px] px-4 py-4 space-y-6 pb-24">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-display font-bold text-foreground"
        >
          Explorar
        </motion.h1>

        <motion.div
          className="space-y-6"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {sections.map((section) => (
            <motion.div key={section.label} variants={item} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((i) => {
                  const badge = "badge" in i && i.badge === "invites" ? pendingInvitesCount : 0;
                  return (
                    <button
                      key={i.path}
                      onClick={() => navigate(i.path)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] text-left"
                      style={{
                        background: i.gold
                          ? "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.05))"
                          : "hsl(var(--card))",
                        border: i.gold
                          ? "1px solid hsl(var(--accent) / 0.3)"
                          : "1px solid hsl(var(--border))",
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: i.gold ? "hsl(var(--accent) / 0.15)" : "hsl(var(--primary) / 0.1)",
                        }}
                      >
                        <i.icon
                          className="h-5 w-5"
                          style={{ color: i.gold ? "hsl(var(--accent))" : "hsl(var(--primary-light))" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{i.label}</p>
                        <p className="text-xs text-muted-foreground">{i.desc}</p>
                      </div>
                      {badge > 0 && (
                        <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                          {badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AppLayout>
  );
}
