import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import type { PermissionAction } from "@/lib/constants/modules";

interface PermissionRow {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

/**
 * usePermissions — reads the live `roles_permissions` table for the
 * current user's primary role and exposes a `can(module, action)` helper.
 *
 * - `super_admin` always bypasses the table and gets full access.
 * - `staleTime: 0` + `refetchOnMount` so changes made in the
 *   Administration console take effect immediately (combined with
 *   the realtime subscription in App.tsx).
 */
export const usePermissions = () => {
  const { data: roles = [] } = useUserRoles();
  const primaryRole = roles[0] ?? null;
  const isSuperAdmin = roles.includes("super_admin");

  const { data: permissions = [] } = useQuery<PermissionRow[]>({
    queryKey: ["permissions", primaryRole],
    queryFn: async () => {
      if (!primaryRole) return [];
      // super_admin doesn't need a fetch — bypass entirely
      if (primaryRole === "super_admin") return [];
      const { data, error } = await supabase
        .from("roles_permissions")
        .select("module, can_read, can_create, can_update, can_delete")
        .eq("role_code", primaryRole);
      if (error) throw error;
      return (data ?? []) as PermissionRow[];
    },
    enabled: !!primaryRole,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  function can(module: string, action: PermissionAction): boolean {
    // super_admin bypasses all checks
    if (isSuperAdmin) return true;
    const perm = permissions.find((p) => p.module === module);
    if (!perm) return false;
    const key = `can_${action}` as keyof PermissionRow;
    return perm[key] === true;
  }

  /**
   * Throw an error if the user lacks the requested permission.
   * Use inside `useMutation`'s `mutationFn` so the error surfaces
   * via the existing `onError` toast.
   */
  function requirePermission(module: string, action: PermissionAction): void {
    if (!can(module, action)) {
      throw new Error(
        "Vous n'avez pas la permission d'effectuer cette action. Contactez votre administrateur."
      );
    }
  }

  return { can, requirePermission, permissions, primaryRole, isSuperAdmin };
};
