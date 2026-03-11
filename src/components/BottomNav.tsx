import { Home, Building2, Zap, Sparkles, Target, Users, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const items = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/assets", icon: Building2, label: "Ativos" },
  { path: "/nova-transacao", icon: Zap, label: "Lançar" },
  { path: "/insights", icon: Sparkles, label: "Insights", badgeKey: "insights" as const },
  { path: "/goals", icon: Target, label: "Metas" },
  { path: "/family-wealth", icon: Users, label: "Família", badgeKey: "invites" as const },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { unreadInsightsCount, pendingInvitesCount } = useNotifications();

  const getBadge = (key?: "insights" | "invites") => {
    if (key === "insights" && unreadInsightsCount > 0) return unreadInsightsCount;
    if (key === "invites" && pendingInvitesCount > 0) return pendingInvitesCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-sidebar border-t border-sidebar-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-1">
        {items.map(({ path, icon: Icon, label, badgeKey }) => {
          const active = pathname === path;
          const badge = getBadge(badgeKey);
          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-col items-center gap-0.5 px-2 py-2 text-xs rounded-lg transition-colors"
              style={{
                color: active ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground) / 0.5)",
              }}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{label}</span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
