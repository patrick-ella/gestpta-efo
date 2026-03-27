import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { EfoLogo } from "@/components/ui/EfoLogo";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 print:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <button onClick={() => navigate("/")} className="flex items-center gap-1.5 hover:opacity-80 transition">
                <EfoLogo size="xs" variant="color" />
                <span className="text-xs font-semibold text-primary hidden sm:inline">GestPTA-EFO</span>
              </button>
              <span className="text-xs text-muted-foreground hidden md:inline ml-2">
                Exercice {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => setDark(!dark)} title={dark ? "Mode clair" : "Mode sombre"}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
