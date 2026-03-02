import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("familia_id")
        .eq("id", session.user.id)
        .single();

      if (profile?.familia_id) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding-family", { replace: true });
      }
    };
    check().finally(() => setLoading(false));
  }, [navigate]);

  if (!loading) return null;

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
