import {
  LayoutDashboard,
  GitBranch,
  ClipboardList,
  PlayCircle,
  FileCheck,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { EfoLogo } from "@/components/ui/EfoLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Cadre Logique", url: "/cadre-logique", icon: GitBranch },
  { title: "Plan de Travail (PTA)", url: "/pta", icon: ClipboardList },
  { title: "Exécution", url: "/execution", icon: PlayCircle },
  { title: "Livrables", url: "/livrables", icon: FileCheck },
  { title: "Rapports", url: "/rapports", icon: BarChart3 },
  { title: "Administration", url: "/administration", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 flex items-center gap-2 px-3 py-4">
            {collapsed ? (
              <EfoLogo size="sm" variant="white" />
            ) : (
              <div className="flex flex-col gap-0.5">
                <EfoLogo size="sm" variant="white" showText />
                <span className="text-[11px] text-sidebar-foreground/50 pl-0.5">EFO / CCAA</span>
              </div>
            )}
          </SidebarGroupLabel>
          <div className="mb-6" />
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-sidebar-accent cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
