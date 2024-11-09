import { SidebarProvider } from "@/components/ui/sidebar";
import { DMSidebar } from "./_components/sidebar";

export default function DMLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DMSidebar />
      {/* DM Sidebar here */}
      {children}
    </SidebarProvider>
  );
}
