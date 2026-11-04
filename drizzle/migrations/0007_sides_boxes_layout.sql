-- Feed usage is recorded in bags; kg stays as the derived value for stock math.
ALTER TABLE public.feed_usage ADD COLUMN bags numeric;
UPDATE public.feed_usage SET bags = round(kg / 25.0, 2) WHERE bags IS NULL;
COMMENT ON COLUMN public.feed_usage.bags IS 'Bags of feed used; kg is derived as bags x kg_per_bag';

-- New pen layout: each pen gets Sides 1-4 (cages.label) with Boxes 1-25 (tiers.level).
CREATE OR REPLACE FUNCTION public.create_pen_layout() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text; b int; cid uuid;
BEGIN
  FOREACH s IN ARRAY ARRAY['1','2','3','4'] LOOP
    INSERT INTO public.cages(user_id, pen_id, label) VALUES (NEW.user_id, NEW.id, s) RETURNING id INTO cid;
    FOR b IN 1..25 LOOP
      INSERT INTO public.tiers(user_id, cage_id, pen_id, level) VALUES (NEW.user_id, cid, NEW.id, b::text);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;

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
  UPDATE tiers SET bird_count = 5 WHERE pen_id = p1;
  INSERT INTO flocks(user_id, name, breed, hatchery, date_placed, age_at_placement_days, starting_count, current_count, pen_id, is_sample)
    VALUES (uid, 'Batch 2026-A (sample)', 'Isa Brown', 'Sample Hatchery', current_date - 120, 1, 500, 486, p1, true) RETURNING id INTO f;
  FOR i IN 0..13 LOOP
    d := current_date - i;
    FOREACH sess IN ARRAY ARRAY['morning','evening'] LOOP
      INSERT INTO egg_sessions(user_id, pen_id, flock_id, date, session) VALUES (uid, p1, f, d, sess) RETURNING id INTO s;
      FOR r IN SELECT t.id AS tid, t.cage_id FROM tiers t JOIN cages c ON c.id = t.cage_id
               WHERE t.pen_id = p1 AND c.label IN ('1','2') AND t.level IN ('1','2','3','4') LOOP
        INSERT INTO egg_collections(user_id, session_id, pen_id, cage_id, tier_id, date, session, good, cracked, rejected)
          VALUES (uid, s, p1, r.cage_id, r.tid, d, sess, CASE WHEN sess='morning' THEN 12 ELSE 7 END + floor(random()*4)::int, floor(random()*2)::int, floor(random()*2)::int);
      END LOOP;
    END LOOP;
  END LOOP;
  INSERT INTO mortality_logs(user_id, flock_id, pen_id, date, kind, count, cause) VALUES (uid, f, p1, current_date - 3, 'death', 2, 'Heat stress (sample)');
  INSERT INTO feed_stock(user_id, feed_type, bags, kg_per_bag, cost_per_bag, supplier, date_received) VALUES (uid, 'layer', 40, 25, 14500, 'Sample Feeds Ltd', current_date - 14);
  INSERT INTO feed_usage(user_id, date, pen_id, flock_id, feed_type, kg, bags)
    SELECT uid, current_date - g, p1, f, 'layer', 55, 2.2 FROM generate_series(0, 13) g;
END $$;
GRANT EXECUTE ON FUNCTION public.seed_sample_data() TO authenticated;

-- Activity log: report feed usage in bags.
CREATE OR REPLACE FUNCTION public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(NEW);
  v_summary text;
begin
  if (TG_TABLE_NAME in ('pens','flocks')) and coalesce((j->>'is_sample')::boolean, false) then
    return null;
  end if;
  if TG_TABLE_NAME = 'egg_collections'
     and coalesce((j->>'good')::int,0) + coalesce((j->>'cracked')::int,0) + coalesce((j->>'rejected')::int,0) = 0 then
    return null;
  end if;
  v_summary := case TG_TABLE_NAME
    when 'pens' then 'New pen: ' || (j->>'name')
    when 'flocks' then 'New flock: ' || (j->>'name')
    when 'egg_sessions' then 'Egg collection session (' || (j->>'session') || '), ' || to_char((j->>'date')::date, 'DD Mon YYYY')
    when 'egg_collections' then 'Egg record (' || (j->>'session') || '): ' || (coalesce((j->>'good')::int,0) + coalesce((j->>'cracked')::int,0) + coalesce((j->>'rejected')::int,0)) || ' eggs'
    when 'mortality_logs' then (case j->>'kind' when 'cull' then 'Culls' else 'Deaths' end) || ': ' || (j->>'count') || ' bird(s)'
    when 'feed_stock' then 'Feed delivery: ' || (j->>'bags') || ' bags ' || (j->>'feed_type')
    when 'feed_usage' then 'Feed used: ' || coalesce(j->>'bags', '0') || ' bags ' || (j->>'feed_type')
    when 'vaccination_schedule' then 'Vaccine scheduled: ' || (j->>'vaccine_name')
    when 'vaccination_records' then 'Vaccinated: ' || (j->>'vaccine_name')
    when 'treatments' then 'Treatment started: ' || (j->>'drug')
    when 'vet_visits' then 'Vet visit' || coalesce(' (' || (j->>'vet_name') || ')', '')
    when 'weight_logs' then 'Weight log: ' || (j->>'avg_weight_g') || ' g'
    else TG_TABLE_NAME
  end;
  insert into public.activity_log (user_id, entity, summary)
  values (coalesce((j->>'user_id')::uuid, auth.uid()), TG_TABLE_NAME, v_summary);
  return null;
end;
$$;