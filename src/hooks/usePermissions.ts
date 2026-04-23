import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";

export const usePermissions = () => {
  const { data: roles = [] } = useUserRoles();
  const primaryRole = roles[0] ?? null;

  const { data: permissions = [] } = useQuery({
    queryKey: ["user-permissions", primaryRole],
    queryFn: async () => {
      if (!primaryRole) return [];
      const { data, error } = await supabase
        .from("roles_permissions")
        .select("module, can_read, can_create, can_update, can_delete")
        .eq("role_code", primaryRole);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!primaryRole,
    staleTime: 0,
    refetchOnMount: true,
  });

  function can(module: string, action: "read" | "create" | "update" | "delete"): boolean {
    if (roles.includes("super_admin")) return true;
    const perm = permissions.find((p) => p.module === module);
    if (!perm) return false;
    return (perm as any)[`can_${action}`] ?? false;
  }

  return { can, permissions, primaryRole };
};
