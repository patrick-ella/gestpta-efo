
ALTER TABLE public.users_profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_profiles_must_change_password
  ON public.users_profiles(must_change_password)
  WHERE must_change_password = true;
