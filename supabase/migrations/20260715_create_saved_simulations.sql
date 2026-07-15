-- Create saved_simulations table
CREATE TABLE IF NOT EXISTS public.saved_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calculator_type TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_simulations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "simulations_select_policy" ON public.saved_simulations;
DROP POLICY IF EXISTS "simulations_insert_policy" ON public.saved_simulations;
DROP POLICY IF EXISTS "simulations_update_policy" ON public.saved_simulations;
DROP POLICY IF EXISTS "simulations_delete_policy" ON public.saved_simulations;

-- Policies for saved_simulations
CREATE POLICY "simulations_select_policy" ON public.saved_simulations
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

CREATE POLICY "simulations_insert_policy" ON public.saved_simulations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      auth.uid()::text = user_id OR
      (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
    )
  );

CREATE POLICY "simulations_update_policy" ON public.saved_simulations
  FOR UPDATE USING (
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );

CREATE POLICY "simulations_delete_policy" ON public.saved_simulations
  FOR DELETE USING (
    auth.uid()::text = user_id OR
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text) = true
  );
