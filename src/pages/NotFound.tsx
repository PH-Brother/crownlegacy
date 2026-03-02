import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <span className="text-6xl block">🛡️</span>
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="text-muted-foreground">Página não encontrada</p>
        <Button onClick={() => navigate("/")} className="gradient-gold text-primary-foreground font-bold min-h-[48px]">
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
