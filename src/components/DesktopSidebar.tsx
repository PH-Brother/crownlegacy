import { Home, Building2, Zap, Bot, Target, Crown, User, LogOut, Sparkles, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/assets", icon: Building2, label: "Ativos" },
  { path: "/nova-transacao", icon: Zap, label: "Lançar" },
  { path: "/ia-conselho", icon: Bot, label: "IA & Análise" },
  { path: "/insights", icon: Sparkles, label: "Insights" },
  { path: "/goals", icon: Target, label: "Metas Patrimônio" },
  { path: "/family-wealth", icon: Users, label: "Família" },
  { path: "/planos", icon: Crown, label: "Planos" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, familia, buscarPerfil, buscarFamilia } = useProfile();

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

  return (
    <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-sidebar border-r border-sidebar-border z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <img src={logo} alt="Legacy Kingdom" className="w-9 h-9 rounded-xl" />
        <span className="text-sidebar-foreground font-semibold text-base tracking-tight">
          Legacy Kingdom 👑
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                  : "text-sidebar-foreground/60 hover:bg-primary/5 hover:text-sidebar-foreground border-l-[3px] border-transparent"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">
              {profile?.nome_completo || "Usuário"}
            </p>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-primary/40 text-primary uppercase"
            >
              {plano}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-muted-foreground hover:text-destructive text-xs transition-colors w-full px-1"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
