import { Home, ArrowLeftRight, BarChart3, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/transacoes", icon: ArrowLeftRight, label: "Transações" },
  { path: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/30 bg-card">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2">
        {items.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
