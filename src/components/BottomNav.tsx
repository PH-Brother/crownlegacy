import { Home, ArrowLeftRight, Plus, BarChart3, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/transacoes", icon: ArrowLeftRight, label: "Transações" },
  { path: "/nova-transacao", icon: Plus, label: "Novo", fab: true },
  { path: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-1">
        {items.map(({ path, icon: Icon, label, fab }) => {
          const active = pathname === path;
          if (fab) {
            return (
              <Link
                key={path}
                to={path}
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full gradient-gold shadow-lg shadow-primary/30 active:scale-95 transition-transform"
              >
                <Icon className="h-7 w-7 text-primary-foreground" />
              </Link>
            );
          }
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
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
