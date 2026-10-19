-- Helper: updated user default
CREATE TABLE public.farm_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  low_feed_threshold_kg numeric NOT NULL DEFAULT 200,
  seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_settings TO authenticated;
GRANT ALL ON public.farm_settings TO service_role;
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON public.farm_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pen_id uuid NOT NULL REFERENCES public.pens(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (label IN ('A','B')),
  UNIQUE (pen_id, label)
);
CREATE TABLE public.tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  cage_id uuid NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  pen_id uuid NOT NULL REFERENCES public.pens(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('Top','Middle','Bottom')),
  bird_count int NOT NULL DEFAULT 0,
  UNIQUE (cage_id, level)
);
CREATE TABLE public.flocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  breed text,
  hatchery text,
  date_placed date NOT NULL DEFAULT current_date,
  age_at_placement_days int NOT NULL DEFAULT 0,
  starting_count int NOT NULL DEFAULT 0,
  current_count int NOT NULL DEFAULT 0,
  pen_id uuid REFERENCES public.pens(id) ON DELETE SET NULL,
  tier_ids uuid[] NOT NULL DEFAULT '{}',
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.egg_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pen_id uuid NOT NULL REFERENCES public.pens(id) ON DELETE CASCADE,
  flock_id uuid REFERENCES public.flocks(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT current_date,
  session text NOT NULL CHECK (session IN ('morning','evening')),
  crates numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pen_id, date, session)
);
CREATE TABLE public.egg_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.egg_sessions(id) ON DELETE CASCADE,
  pen_id uuid NOT NULL REFERENCES public.pens(id) ON DELETE CASCADE,
  cage_id uuid NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  date date NOT NULL,
  session text NOT NULL,
  good int NOT NULL DEFAULT 0 CHECK (good >= 0),
  cracked int NOT NULL DEFAULT 0 CHECK (cracked >= 0),
  rejected int NOT NULL DEFAULT 0 CHECK (rejected >= 0),
  UNIQUE (session_id, tier_id)
);
CREATE TABLE public.mortality_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  pen_id uuid REFERENCES public.pens(id) ON DELETE SET NULL,
  tier_id uuid REFERENCES public.tiers(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT current_date,
  kind text NOT NULL DEFAULT 'death' CHECK (kind IN ('death','cull')),
  count int NOT NULL CHECK (count > 0),
  cause text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.feed_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  feed_type text NOT NULL CHECK (feed_type IN ('starter','grower','layer')),
  bags numeric NOT NULL DEFAULT 0,
  kg_per_bag numeric NOT NULL DEFAULT 25,
  cost_per_bag numeric NOT NULL DEFAULT 0,
  supplier text,
  date_received date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.feed_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT current_date,
  pen_id uuid REFERENCES public.pens(id) ON DELETE SET NULL,
  flock_id uuid REFERENCES public.flocks(id) ON DELETE SET NULL,
  feed_type text NOT NULL CHECK (feed_type IN ('starter','grower','layer')),
  kg numeric NOT NULL CHECK (kg > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vaccination_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  age_days int,
  due_date date NOT NULL,
  route text,
  dosage text,
  notes text
);
CREATE TABLE public.vaccination_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  schedule_id uuid REFERENCES public.vaccination_schedule(id) ON DELETE CASCADE,
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  date_given date NOT NULL DEFAULT current_date,
  batch_number text,
  route text,
  dosage text,
  administered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  flock_id uuid REFERENCES public.flocks(id) ON DELETE CASCADE,
  pen_id uuid REFERENCES public.pens(id) ON DELETE SET NULL,
  drug text NOT NULL,
  dosage text,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  withdrawal_days int DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vet_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  flock_id uuid REFERENCES public.flocks(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  vet_name text,
  diagnosis text,
  notes text,
  cost numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  avg_weight_g numeric NOT NULL,
  sample_size int,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pens','cages','tiers','flocks','egg_sessions','egg_collections','mortality_logs','feed_stock','feed_usage','vaccination_schedule','vaccination_records','treatments','vet_visits','weight_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE INDEX ON public.%I (user_id)', t);
  END LOOP;
END $$;

-- Auto-create cages & tiers for each pen
CREATE OR REPLACE FUNCTION public.create_pen_layout() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; l text; cid uuid;
BEGIN
  FOREACH c IN ARRAY ARRAY['A','B'] LOOP
    INSERT INTO public.cages(user_id, pen_id, label) VALUES (NEW.user_id, NEW.id, c) RETURNING id INTO cid;
    FOREACH l IN ARRAY ARRAY['Top','Middle','Bottom'] LOOP
      INSERT INTO public.tiers(user_id, cage_id, pen_id, level) VALUES (NEW.user_id, cid, NEW.id, l);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_pen_layout() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pens_layout AFTER INSERT ON public.pens FOR EACH ROW EXECUTE FUNCTION public.create_pen_layout();

-- Mortality adjusts flock live count
CREATE OR REPLACE FUNCTION public.mortality_adjust() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    UPDATE public.flocks SET current_count = current_count + OLD.count WHERE id = OLD.flock_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    UPDATE public.flocks SET current_count = GREATEST(current_count - NEW.count, 0) WHERE id = NEW.flock_id;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.mortality_adjust() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mortality_adjust AFTER INSERT OR UPDATE OR DELETE ON public.mortality_logs FOR EACH ROW EXECUTE FUNCTION public.mortality_adjust();

-- Sample data seeding (runs once per user)
CREATE OR REPLACE FUNCTION public.seed_sample_data() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p1 uuid; p2 uuid; f uuid; s uuid; d date; sess text; r record; i int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM farm_settings WHERE user_id = uid AND seeded) THEN RETURN; END IF;
  INSERT INTO farm_settings(user_id, seeded) VALUES (uid, true)
    ON CONFLICT (user_id) DO UPDATE SET seeded = true;
  INSERT INTO pens(user_id, name, sort_order, is_sample) VALUES (uid, 'Pen 1', 1, true) RETURNING id INTO p1;
  INSERT INTO pens(user_id, name, sort_order, is_sample) VALUES (uid, 'Pen 2', 2, true) RETURNING id INTO p2;
  UPDATE tiers SET bird_count = 80 WHERE pen_id = p1;
  INSERT INTO flocks(user_id, name, breed, hatchery, date_placed, age_at_placement_days, starting_count, current_count, pen_id, is_sample)
    VALUES (uid, 'Batch 2026-A (sample)', 'Isa Brown', 'Sample Hatchery', current_date - 120, 1, 500, 486, p1, true) RETURNING id INTO f;
  UPDATE flocks SET tier_ids = (SELECT array_agg(id) FROM tiers WHERE pen_id = p1) WHERE id = f;
  FOR i IN 0..13 LOOP
    d := current_date - i;
    FOREACH sess IN ARRAY ARRAY['morning','evening'] LOOP
      INSERT INTO egg_sessions(user_id, pen_id, flock_id, date, session) VALUES (uid, p1, f, d, sess) RETURNING id INTO s;
      FOR r IN SELECT t.id, t.cage_id FROM tiers t WHERE t.pen_id = p1 LOOP
        INSERT INTO egg_collections(user_id, session_id, pen_id, cage_id, tier_id, date, session, good, cracked, rejected)
          VALUES (uid, s, p1, r.cage_id, r.id, d, sess, CASE WHEN sess='morning' THEN 40 ELSE 25 END + floor(random()*8)::int, floor(random()*2)::int, floor(random()*2)::int);
      END LOOP;
    END LOOP;
  END LOOP;
  INSERT INTO mortality_logs(user_id, flock_id, pen_id, date, kind, count, cause) VALUES (uid, f, p1, current_date - 3, 'death', 2, 'Heat stress (sample)');
  INSERT INTO feed_stock(user_id, feed_type, bags, kg_per_bag, cost_per_bag, supplier, date_received) VALUES (uid, 'layer', 40, 25, 14500, 'Sample Feeds Ltd', current_date - 14);
  INSERT INTO feed_usage(user_id, date, pen_id, flock_id, feed_type, kg)
    SELECT uid, current_date - g, p1, f, 'layer', 55 FROM generate_series(0, 13) g;
END $$;
GRANT EXECUTE ON FUNCTION public.seed_sample_data() TO authenticated;