import { Home, Building2, Zap, Bot, Target, Crown, User, LogOut, Sparkles, Users, FileText, TrendingUp, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/assets", icon: Building2, label: "Ativos" },
  { path: "/nova-transacao", icon: Zap, label: "Lançar" },
  { path: "/ia-conselho", icon: Bot, label: "Dicas de Sabedoria" },
  { path: "/insights", icon: Sparkles, label: "Insights", badgeKey: "insights" as const },
  { path: "/financial-insights", icon: TrendingUp, label: "Análise IA" },
  { path: "/copilot", icon: MessageCircle, label: "Copilot IA" },
  { path: "/projection", icon: TrendingUp, label: "Projeção" },
  { path: "/goals", icon: Target, label: "Metas Patrimônio" },
  { path: "/family-wealth", icon: Users, label: "Família", badgeKey: "invites" as const },
  { path: "/documents", icon: FileText, label: "Documentos" },
  { path: "/planos", icon: Crown, label: "Planos" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, familia, buscarPerfil, buscarFamilia } = useProfile();
  const { unreadInsightsCount, pendingInvitesCount } = useNotifications();

  useEffect(() => {
    if (user?.id) {
      buscarPerfil(user.id).then((p) => {
        if (p?.familia_id) buscarFamilia(p.familia_id);
      });
    }
  }, [user?.id, buscarPerfil, buscarFamilia]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = profile?.nome_completo
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const plano = familia?.plano || "trial";

  const getBadge = (key?: "insights" | "invites") => {
    if (key === "insights") return unreadInsightsCount;
    if (key === "invites") return pendingInvitesCount;
    return 0;
  };

  return (
    <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-sidebar z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <Crown className="h-7 w-7 text-sidebar-primary shrink-0" />
        <div className="min-w-0">
          <span className="text-sidebar-primary font-bold text-sm tracking-tight block">Crown & Legacy</span>
          <span className="text-sidebar-foreground/50 text-[10px] tracking-wider uppercase">Wealth Intelligence</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, badgeKey }) => {
          const active = pathname === path;
          const badge = getBadge(badgeKey);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary border-l-[3px] border-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-[3px] border-transparent"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
              {badge > 0 && (
                <span className="ml-auto h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">
              {profile?.nome_completo || "Usuário"}
            </p>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-sidebar-primary/40 text-sidebar-primary uppercase"
            >
              {plano}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sidebar-foreground/50 hover:text-sidebar-primary text-xs transition-colors w-full px-1"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
