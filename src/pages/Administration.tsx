import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, ScrollText, Settings, Database, Shield, Link2 } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminAudit } from "@/components/admin/AdminAudit";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminMaintenance } from "@/components/admin/AdminMaintenance";
import { AdminRolesPermissions } from "@/components/admin/AdminRolesPermissions";
import { AdminKpiConnexions } from "@/components/admin/AdminKpiConnexions";

const Administration = () => {
  const { data: roles, isLoading } = useUserRoles();
  const isSuperAdmin = roles?.includes("super_admin");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <span className="text-5xl">🔒</span>
        <h2 className="text-xl font-bold text-foreground">Accès réservé</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[360px]">
          Cette section est réservée exclusivement à l'Administrateur Principal. Contactez votre administrateur si vous pensez avoir besoin de cet accès.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Administration</h1>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Rôles & Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="connexions" className="gap-1">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Connexions des indicateurs</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Journal d'audit</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Paramètres</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><AdminUsers /></TabsContent>
        <TabsContent value="roles" className="mt-4"><AdminRolesPermissions /></TabsContent>
        <TabsContent value="connexions" className="mt-4"><AdminKpiConnexions /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AdminAudit /></TabsContent>
        <TabsContent value="settings" className="mt-4"><AdminSettings /></TabsContent>
        <TabsContent value="maintenance" className="mt-4"><AdminMaintenance /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Administration;
