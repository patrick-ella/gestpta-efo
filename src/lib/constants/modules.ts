// Central registry of permission module keys.
// Keep these aligned with the rows in the `roles_permissions` table
// and with the MODULES list in AdminRolesPermissions.tsx.

export const MODULES = {
  DASHBOARD: "dashboard",
  CADRE_LOGIQUE: "cadre_logique",
  PTA: "pta",
  EXECUTION: "execution",
  EXTRANTS: "extrants",
  RAPPORTS: "rapports",
  OBJECTIFS_EVALUATION: "objectifs_evaluation",
  ADMINISTRATION: "administration",
} as const;

export type ModuleKey = typeof MODULES[keyof typeof MODULES];
export type PermissionAction = "read" | "create" | "update" | "delete";
