import { Lock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleKey, PermissionAction } from "@/lib/constants/modules";

interface RequirePermissionProps {
  module: ModuleKey | string;
  action?: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Page-level guard. Renders `children` only when the current user
 * has the requested permission; otherwise shows an "Accès non autorisé"
 * panel (or the supplied fallback).
 */
export const RequirePermission = ({
  module,
  action = "read",
  children,
  fallback,
}: RequirePermissionProps) => {
  const { can } = usePermissions();

  if (!can(module, action)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center space-y-3 p-8 rounded-lg border bg-card">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Accès non autorisé
          </h2>
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas accès à ce module. Contactez votre administrateur
            pour modifier vos permissions.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequirePermission;
