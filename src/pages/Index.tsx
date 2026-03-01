import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
        <span className="text-4xl">👑</span>
        <h1 className="text-2xl font-bold text-primary">Legacy Kingdom</h1>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
