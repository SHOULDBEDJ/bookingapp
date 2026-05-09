
-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customers_phone_idx ON public.customers(phone);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bookings_date_idx ON public.bookings(booking_date);
CREATE INDEX bookings_customer_idx ON public.bookings(customer_id);

-- Booking photos
CREATE TABLE public.booking_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audio notes (polymorphic for bookings & expenses)
CREATE TABLE public.audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('booking','expense')),
  parent_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audio_notes_parent_idx ON public.audio_notes(parent_type, parent_id);

-- Expense Types
CREATE TABLE public.expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expense_type_id UUID REFERENCES public.expense_types(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_date_idx ON public.expenses(expense_date);

-- Expense photos
CREATE TABLE public.expense_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gallery albums
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cover_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gallery media
CREATE TABLE public.album_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX album_media_album_idx ON public.album_media(album_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_albums_updated BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;

-- Single shared family account: any authenticated user can do anything
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['customers','bookings','booking_photos','audio_notes','expense_types','expenses','expense_photos','albums','album_media']) LOOP
    EXECUTE format('CREATE POLICY "auth_all_select" ON public.%I FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "auth_all_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth_all_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth_all_delete" ON public.%I FOR DELETE TO authenticated USING (true);', t);
  END LOOP;
END $$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('bills','bills', true),
  ('expense-photos','expense-photos', true),
  ('audio','audio', true),
  ('gallery','gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated user can manage these buckets
CREATE POLICY "auth_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('bills','expense-photos','audio','gallery'));
CREATE POLICY "auth_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('bills','expense-photos','audio','gallery'));
CREATE POLICY "auth_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('bills','expense-photos','audio','gallery'));
CREATE POLICY "auth_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('bills','expense-photos','audio','gallery'));

-- Public read for buckets (so signed-in clients without signed URLs work too)
CREATE POLICY "public_storage_read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id IN ('bills','expense-photos','audio','gallery'));
