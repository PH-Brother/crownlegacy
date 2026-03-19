import { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { X, RefreshCw } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import ValuePreview from "./pages/ValuePreview";
import Auth from "./pages/Auth";
import OnboardingFamily from "./pages/OnboardingFamily";
import Onboarding from "./pages/Onboarding";
import JoinWithCode from "./pages/JoinWithCode";
import Dashboard from "./pages/Dashboard";
import NovaTransacao from "./pages/NovaTransacao";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import FinancialHealth from "./pages/FinancialHealth";
import Perfil from "./pages/Perfil";
import FamilyMembers from "./pages/FamilyMembers";
import Settings from "./pages/Settings";
import UploadPage from "./pages/Upload";
import Checkin from "./pages/Checkin";
import Assinatura from "./pages/Assinatura";
import Planos from "./pages/Planos";
import IAConselho from "./pages/IAConselho";
import Metas from "./pages/Metas";
import Assets from "./pages/Assets";
import Insights from "./pages/Insights";
import Goals from "./pages/Goals";
import FamilyWealth from "./pages/FamilyWealth";
import ResetPassword from "./pages/ResetPassword";
import WealthScore from "./pages/WealthScore";
import DocumentsPage from "./pages/Documents";
import ExtractedTransactions from "./pages/ExtractedTransactions";
import FinancialInsights from "./pages/FinancialInsights";
import CopilotPage from "./pages/Copilot";
import ProjectionPage from "./pages/Projection";
import Challenges from "./pages/Challenges";
import Share from "./pages/Share";
import FamilyNetwork from "./pages/FamilyNetwork";
import MinhaFamilia from "./pages/MinhaFamilia";
import Mais from "./pages/Mais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [novaVersao, setNovaVersao] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const verificarUpdate = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        swRegistrationRef.current = reg;
        if (!sessionStorage.getItem('banner-update-dismissed')) {
          setNovaVersao(true);
        }
        return;
      }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            swRegistrationRef.current = reg;
            if (!sessionStorage.getItem('banner-update-dismissed')) {
              setNovaVersao(true);
            }
          }
        });
      });
    };

    navigator.serviceWorker.ready.then((reg) => {
      verificarUpdate(reg);
      const intervalo = setInterval(() => {
        reg.update().catch(() => {});
      }, 60 * 1000);
      return () => clearInterval(intervalo);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleAtualizar = () => {
    setAtualizando(true);
    const reg = swRegistrationRef.current;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => window.location.reload(), 3000);
    } else {
      window.location.reload();
    }
  };

  const handleFecharBanner = () => {
    setNovaVersao(false);
    sessionStorage.setItem('banner-update-dismissed', '1');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner
          position="bottom-center"
          richColors
          duration={4000}
          toastOptions={{
            style: {
              background: 'rgba(20,20,20,0.95)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#fff',
            },
          }}
        />
        <AuthProvider>
          <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ValuePreview />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/wealth-score" element={<WealthScore />} />
              <Route path="/onboarding-family" element={<OnboardingFamily />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/join-family" element={<JoinWithCode />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/nova-transacao" element={<NovaTransacao />} />
                <Route path="/transacoes" element={<Transactions />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/saude-financeira" element={<FinancialHealth />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/profile" element={<Perfil />} />
                <Route path="/membros" element={<FamilyMembers />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/checkin" element={<Checkin />} />
                <Route path="/assinatura" element={<Assinatura />} />
                <Route path="/planos" element={<Planos />} />
                <Route path="/ia-conselho" element={<IAConselho />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/family-wealth" element={<FamilyWealth />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/extracted-transactions" element={<ExtractedTransactions />} />
                <Route path="/financial-insights" element={<FinancialInsights />} />
                <Route path="/copilot" element={<CopilotPage />} />
                <Route path="/projection" element={<ProjectionPage />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/share" element={<Share />} />
                <Route path="/family-network" element={<FamilyNetwork />} />
                <Route path="/minha-familia" element={<MinhaFamilia />} />
                <Route path="/mais" element={<Mais />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>

        {/* Banner de atualização PWA */}
        {novaVersao && (
          <div
            className="fixed bottom-20 left-4 right-4 z-[9999] bg-primary text-primary-foreground rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-6 sm:max-w-sm"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <RefreshCw className={`w-4 h-4 shrink-0 ${atualizando ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium truncate">
                {atualizando ? "Atualizando..." : "Nova versão disponível"}
              </span>
            </div>
            <button
              onClick={handleAtualizar}
              disabled={atualizando}
              className="shrink-0 bg-primary-foreground text-primary text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              Atualizar
            </button>
            <button
              onClick={handleFecharBanner}
              disabled={atualizando}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-1"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
