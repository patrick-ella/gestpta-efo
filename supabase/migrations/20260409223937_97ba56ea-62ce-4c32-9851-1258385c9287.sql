
-- Table 1: Roles registry
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: Permissions per role per module
CREATE TABLE IF NOT EXISTS public.roles_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_code TEXT NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_code, module)
);

CREATE INDEX IF NOT EXISTS idx_roles_permissions_role_code ON public.roles_permissions(role_code);

-- RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions ENABLE ROW LEVEL SECURITY;

-- Read policies (all authenticated)
CREATE POLICY "Authenticated read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read roles_permissions" ON public.roles_permissions FOR SELECT TO authenticated USING (true);

-- Write policies (super_admin only)
CREATE POLICY "Super admin manage roles" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin manage roles_permissions" ON public.roles_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Seed system roles
INSERT INTO public.roles (code, libelle, description, is_system) VALUES
  ('super_admin', 'Administrateur Principal', 'Accès complet à toutes les fonctionnalités et à la console d''administration.', true),
  ('admin_pta', 'Administrateur PTA', 'Gestion complète du PTA, extrants, personnel EFO et génération de documents.', true),
  ('responsable_activite', 'Responsable d''Activité', 'Édition des données de son activité et assignation des agents.', true),
  ('agent_saisie', 'Agent de Saisie', 'Saisie de l''exécution et upload de preuves sur les extrants.', true),
  ('consultant', 'Consultant Externe', 'Lecture seule sur toutes les données, téléchargement des preuves.', true)
ON CONFLICT (code) DO NOTHING;

-- Seed permissions: super_admin (all modules, all perms)
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete)
SELECT 'super_admin', m, true, true, true, true
FROM unnest(ARRAY['dashboard','cadre_logique','pta','execution','extrants','rapports','objectifs_evaluation','administration']) AS m
ON CONFLICT (role_code, module) DO NOTHING;

-- admin_pta (all except administration)
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete)
SELECT 'admin_pta', m, true, true, true, true
FROM unnest(ARRAY['dashboard','cadre_logique','pta','execution','extrants','rapports','objectifs_evaluation']) AS m
ON CONFLICT (role_code, module) DO NOTHING;
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete)
VALUES ('admin_pta','administration', false, false, false, false)
ON CONFLICT (role_code, module) DO NOTHING;

-- responsable_activite
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete) VALUES
  ('responsable_activite','dashboard', true, false, false, false),
  ('responsable_activite','cadre_logique', true, false, false, false),
  ('responsable_activite','pta', true, false, false, false),
  ('responsable_activite','execution', true, true, true, false),
  ('responsable_activite','extrants', true, true, true, false),
  ('responsable_activite','rapports', true, true, false, false),
  ('responsable_activite','objectifs_evaluation', true, true, true, false),
  ('responsable_activite','administration', false, false, false, false)
ON CONFLICT (role_code, module) DO NOTHING;

-- agent_saisie
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete) VALUES
  ('agent_saisie','dashboard', true, false, false, false),
  ('agent_saisie','cadre_logique', true, false, false, false),
  ('agent_saisie','pta', true, false, false, false),
  ('agent_saisie','execution', true, false, true, false),
  ('agent_saisie','extrants', true, true, false, false),
  ('agent_saisie','rapports', true, false, false, false),
  ('agent_saisie','objectifs_evaluation', true, false, false, false),
  ('agent_saisie','administration', false, false, false, false)
ON CONFLICT (role_code, module) DO NOTHING;

-- consultant (read only)
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete)
SELECT 'consultant', m, true, false, false, false
FROM unnest(ARRAY['dashboard','cadre_logique','pta','execution','extrants','rapports','objectifs_evaluation']) AS m
ON CONFLICT (role_code, module) DO NOTHING;
INSERT INTO public.roles_permissions (role_code, module, can_read, can_create, can_update, can_delete)
VALUES ('consultant','administration', false, false, false, false)
ON CONFLICT (role_code, module) DO NOTHING;
