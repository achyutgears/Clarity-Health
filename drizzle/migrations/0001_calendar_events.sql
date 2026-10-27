-- My Care Calendar: personal entries a signed-in patient creates for themselves.
-- These are NOT bookings with a clinic. Additive only: this migration creates a new
-- table, index, trigger function, trigger and policies. Nothing existing is dropped or altered.
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('appointment', 'health_task', 'medication', 'reminder', 'other')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NULL,
  location text NULL CHECK (location IS NULL OR char_length(location) <= 300),
  notes text NULL CHECK (notes IS NULL OR char_length(notes) <= 2000),
  reminder_minutes integer NULL CHECK (reminder_minutes IS NULL OR reminder_minutes IN (0, 15, 60, 1440)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_ends_after_start CHECK (ends_at IS NULL OR ends_at > starts_at)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS calendar_events_user_id_starts_at_idx ON public.calendar_events (user_id, starts_at);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.calendar_events_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'calendar_events_set_updated_at'
      AND tgrelid = 'public.calendar_events'::regclass
  ) THEN
    CREATE TRIGGER calendar_events_set_updated_at
      BEFORE UPDATE ON public.calendar_events
      FOR EACH ROW EXECUTE FUNCTION public.calendar_events_set_updated_at();
  END IF;
END;
$$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
--> statement-breakpoint
GRANT ALL ON public.calendar_events TO service_role;
--> statement-breakpoint
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'own select') THEN
    CREATE POLICY "own select" ON public.calendar_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'own insert') THEN
    CREATE POLICY "own insert" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'own update') THEN
    CREATE POLICY "own update" ON public.calendar_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'own delete') THEN
    CREATE POLICY "own delete" ON public.calendar_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END;
$$;
