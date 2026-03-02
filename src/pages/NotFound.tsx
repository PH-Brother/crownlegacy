import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div
          style={{ background: 'linear-gradient(135deg, #D4AF37, #F4E17A, #B8860B)', boxShadow: '0 0 40px rgba(212,175,55,0.5), 0 8px 32px rgba(0,0,0,0.4)' }}
          className="w-20 h-20 mx-auto flex items-center justify-center text-4xl rounded-2xl"
        >
          🛡️
        </div>
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="text-muted-foreground">Página não encontrada</p>
        <Button onClick={() => navigate("/")} className="gradient-gold text-primary-foreground font-bold min-h-[48px]">
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
