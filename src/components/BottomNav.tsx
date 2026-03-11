import { Home, Building2, Plus, Zap, Crown, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/assets", icon: Building2, label: "Ativos" },
  { path: "/nova-transacao", icon: Plus, label: "Lançar" },
  { path: "/ia-conselho", icon: Zap, label: "IA" },
  { path: "/planos", icon: Crown, label: "Planos" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(212,175,55,0.2)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-1">
        {items.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors relative"
              style={{ color: active ? "#D4AF37" : "rgba(255,255,255,0.4)" }}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {active && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                  style={{ background: "#D4AF37" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
