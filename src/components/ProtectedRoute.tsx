import logo from "@/assets/logo.png";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Legacy Kingdom" className="w-20 h-20 rounded-2xl animate-shield-pulse drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
