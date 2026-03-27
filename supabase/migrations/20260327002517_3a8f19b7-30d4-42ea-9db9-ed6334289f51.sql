
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_pta', 'responsable_activite', 'agent_saisie', 'consultant');

-- 1. exercices
CREATE TABLE public.exercices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annee INT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'brouillon',
  budget_total BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercices ENABLE ROW LEVEL SECURITY;

-- 2. activites
CREATE TABLE public.activites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  libelle TEXT NOT NULL,
  objectif_operationnel TEXT,
  budget_total BIGINT DEFAULT 0,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

-- 3. taches
CREATE TABLE public.taches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activite_id UUID NOT NULL REFERENCES public.activites(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  libelle TEXT NOT NULL,
  livrables TEXT,
  budget_total BIGINT DEFAULT 0,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

-- 4. sous_taches
CREATE TABLE public.sous_taches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID NOT NULL REFERENCES public.taches(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  libelle TEXT NOT NULL,
  budget_prevu BIGINT DEFAULT 0,
  lignes_budgetaires TEXT,
  mode_execution TEXT,
  sources_financement TEXT,
  responsable TEXT,
  ressources_humaines TEXT,
  risques TEXT,
  mesures_attenuation TEXT,
  trimestre_t1 BOOL DEFAULT false,
  trimestre_t2 BOOL DEFAULT false,
  trimestre_t3 BOOL DEFAULT false,
  trimestre_t4 BOOL DEFAULT false,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sous_taches ENABLE ROW LEVEL SECURITY;

-- 5. executions
CREATE TABLE public.executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sous_tache_id UUID NOT NULL REFERENCES public.sous_taches(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id) ON DELETE CASCADE,
  montant_realise BIGINT DEFAULT 0,
  avancement_pct INT DEFAULT 0,
  statut TEXT DEFAULT 'non_demarre',
  observations TEXT,
  date_maj TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- 6. livrables
CREATE TABLE public.livrables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tache_id UUID NOT NULL REFERENCES public.taches(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  produit BOOL DEFAULT false,
  date_production DATE,
  fichier_url TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livrables ENABLE ROW LEVEL SECURITY;

-- 7. users_profiles
CREATE TABLE public.users_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom TEXT,
  prenom TEXT,
  email TEXT,
  centre TEXT,
  actif BOOL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

-- 8. user_roles (separate table for roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 9. journal_audit
CREATE TABLE public.journal_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  entite TEXT,
  action TEXT,
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consultant');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY "Authenticated can read profiles" ON public.users_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated read exercices" ON public.exercices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage exercices" ON public.exercices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta'));

CREATE POLICY "Authenticated read activites" ON public.activites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage activites" ON public.activites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta'));

CREATE POLICY "Authenticated read taches" ON public.taches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage taches" ON public.taches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta'));

CREATE POLICY "Authenticated read sous_taches" ON public.sous_taches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins or agents manage sous_taches" ON public.sous_taches FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta') OR public.has_role(auth.uid(), 'agent_saisie')
);

CREATE POLICY "Authenticated read executions" ON public.executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents and admins manage executions" ON public.executions FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta') OR public.has_role(auth.uid(), 'agent_saisie') OR public.has_role(auth.uid(), 'responsable_activite')
);

CREATE POLICY "Authenticated read livrables" ON public.livrables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins or agents manage livrables" ON public.livrables FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta') OR public.has_role(auth.uid(), 'agent_saisie')
);

CREATE POLICY "Admins read audit" ON public.journal_audit FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_pta')
);
CREATE POLICY "System inserts audit" ON public.journal_audit FOR INSERT TO authenticated WITH CHECK (true);
