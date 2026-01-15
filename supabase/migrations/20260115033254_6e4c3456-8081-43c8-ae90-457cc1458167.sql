-- 1. Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Create user_activity table for analytics
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_name text NOT NULL,
  session_id uuid,
  duration_seconds integer,
  screen_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 7. Create indexes for performance
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at);
CREATE INDEX idx_user_activity_event_type ON public.user_activity(event_type);
CREATE INDEX idx_user_activity_event_name ON public.user_activity(event_name);

-- 8. Enable RLS on user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- 9. Users can only insert their own activity
CREATE POLICY "Users can insert own activity"
ON public.user_activity FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 10. Only admins can read all activity
CREATE POLICY "Admins can read all activity"
ON public.user_activity FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 11. Add last_active_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- 12. Add jay@gmail.com as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('5a390fbd-0d01-46a6-82b9-ef805ac60ac2', 'admin');

-- 13. Add pyasharel@gmail.com as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ae162689-de33-4e69-b24f-e545de82f8db', 'admin');