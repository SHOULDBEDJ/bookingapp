-- Location Sessions
CREATE TABLE public.location_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'ended')),
  duration_type TEXT CHECK (duration_type IN ('current_only', '15m', '1h', 'indefinite')),
  expires_at TIMESTAMPTZ,
  last_lat FLOAT,
  last_lng FLOAT,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX location_sessions_booking_idx ON public.location_sessions(booking_id);
CREATE INDEX location_sessions_token_idx ON public.location_sessions(token);

CREATE TRIGGER trg_location_sessions_updated BEFORE UPDATE ON public.location_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.location_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated Admin Policies (full access)
CREATE POLICY "auth_location_sessions_select" ON public.location_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_location_sessions_insert" ON public.location_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_location_sessions_update" ON public.location_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_location_sessions_delete" ON public.location_sessions FOR DELETE TO authenticated USING (true);

-- Anonymous Policies (by token)
CREATE POLICY "anon_location_sessions_select" ON public.location_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_location_sessions_update" ON public.location_sessions FOR UPDATE TO anon USING (true);
