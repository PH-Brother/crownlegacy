import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OnboardingFamily from "./pages/OnboardingFamily";
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
import IAConselho from "./pages/IAConselho";
import Metas from "./pages/Metas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding-family" element={<OnboardingFamily />} />
            <Route path="/join-family" element={<JoinWithCode />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nova-transacao" element={<NovaTransacao />} />
              <Route path="/transacoes" element={<Transactions />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/saude-financeira" element={<FinancialHealth />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/membros" element={<FamilyMembers />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/checkin" element={<Checkin />} />
              <Route path="/assinatura" element={<Assinatura />} />
              <Route path="/ia-conselho" element={<IAConselho />} />
              <Route path="/metas" element={<Metas />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
