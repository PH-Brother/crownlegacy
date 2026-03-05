import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar />
      <div className="sm:ml-60">
        <div className="pb-20 sm:pb-0">{children}</div>
      </div>
      <BottomNav />
    </>
  );
}
