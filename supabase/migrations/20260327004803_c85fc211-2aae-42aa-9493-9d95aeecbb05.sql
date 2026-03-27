
-- Activity assignments for responsable_activite
CREATE TABLE IF NOT EXISTS public.activite_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activite_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activite_id)
);

ALTER TABLE public.activite_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage assignments"
ON public.activite_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users read own assignments"
ON public.activite_assignments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- App settings (single-row config)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name text DEFAULT 'GestPTA-EFO',
  exercice_actif_id uuid,
  logo_url text,
  rapport_footer text DEFAULT 'École de Formation en Aéronautique — ASECNA',
  session_duration_min integer DEFAULT 60,
  admin_email text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins manage settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default row
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Allow super_admin to manage profiles
CREATE POLICY "Super admins manage profiles"
ON public.users_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));
