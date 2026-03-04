import { useEffect } from "react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const checkFamily = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.familia_id) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    };

    checkFamily();
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="Legacy Kingdom" className="w-20 h-20 rounded-2xl animate-shield-pulse drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
        <h1 className="text-2xl font-bold text-primary">Legacy Kingdom</h1>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
