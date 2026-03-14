import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const hideFAB = ["/copilot", "/ia-conselho"].includes(location.pathname);

  return (
    <>
      <DesktopSidebar />
      <div className="sm:ml-60">
        <div className="pb-20 sm:pb-0">{children}</div>
      </div>
      <BottomNav />

      {/* Floating AI Button */}
      {!hideFAB && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          onClick={() => navigate("/copilot")}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-light)))",
            boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)",
            color: "hsl(var(--primary-foreground))",
          }}
          whileHover={{ scale: 1.05, boxShadow: "0 6px 28px hsl(var(--primary) / 0.5)" }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wide">Perguntar à IA</span>
        </motion.button>
      )}
    </>
  );
}
