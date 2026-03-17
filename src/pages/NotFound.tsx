import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-CL-Verde-dourado-Gold-claro.png";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <img src={logo} alt="Crown & Legacy" className="w-20 h-20 mx-auto rounded-2xl drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="text-muted-foreground">Página não encontrada</p>
        <Button onClick={() => navigate("/")} className="gradient-gold text-primary-foreground font-bold min-h-[48px]">
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
