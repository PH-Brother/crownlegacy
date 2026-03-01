import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "auth") return <Navigate to="/auth" replace />;
  if (status === "no-family") return <Navigate to="/onboarding-family" replace />;
  return <Outlet />;
}
