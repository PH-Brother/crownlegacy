import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface StripeCheckoutProps {
  priceId: string;
  planType: string;
}

export default function StripeCheckout({ priceId, planType }: StripeCheckoutProps) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!priceId) {
      toast({ title: "Preço inválido", variant: "destructive" });
      return;
    }
    if (!planType) {
      toast({ title: "Plano inválido", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Faça login primeiro", variant: "destructive" });
      return;
    }
    if (!session?.access_token) {
      toast({ title: "Sessão expirada, faça login novamente", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const { data, error } = await supabase.functions.invoke("criar-checkout", {
        body: {
          priceId,
          userId: user.id,
          userEmail: user.email || "",
          familiaId: "",
        },
      });

      clearTimeout(timeout);

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.url && typeof data.url === "string") {
        window.location.href = data.url;
      } else {
        throw new Error("Plano não encontrado");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao processar pagamento";
      const isTimeout = msg.includes("abort");
      toast({
        title: isTimeout ? "Operação demorou, tente novamente" : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full sm:w-auto gradient-gold text-primary-foreground font-bold"
      aria-label={`Assinar plano ${planType}`}
      aria-busy={loading}
      aria-disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        `Assinar ${planType}`
      )}
    </Button>
  );
}
