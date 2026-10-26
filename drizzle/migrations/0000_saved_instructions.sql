CREATE TABLE public.saved_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.saved_instructions TO authenticated;
GRANT ALL ON public.saved_instructions TO service_role;
ALTER TABLE public.saved_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.saved_instructions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.saved_instructions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.saved_instructions FOR DELETE TO authenticated USING (auth.uid() = user_id);