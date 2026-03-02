import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-center" richColors />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
