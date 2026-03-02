import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute() {
  const [status, setStatus] = useState<"loading" | "auth" | "no-family" | "ok">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("auth");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.familia_id) {
        setStatus("no-family");
      } else {
        setStatus("ok");
      }
    };
    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)', boxShadow: '0 0 40px rgba(212,175,55,0.5), 0 8px 32px rgba(0,0,0,0.4)' }}
            className="w-20 h-20 flex items-center justify-center text-4xl rounded-2xl animate-shield-pulse"
          >
            🛡️
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === "auth") return <Navigate to="/auth" replace />;
  if (status === "no-family") return <Navigate to="/onboarding-family" replace />;
  return <Outlet />;
}
