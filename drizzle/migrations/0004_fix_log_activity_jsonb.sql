create or replace function public.log_activity()
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
  v_summary := case TG_TABLE_NAME
    when 'pens' then 'New pen: ' || (j->>'name')
    when 'flocks' then 'New flock: ' || (j->>'name')
    when 'egg_sessions' then 'Egg collection session (' || (j->>'session') || '), ' || to_char((j->>'date')::date, 'DD Mon YYYY')
    when 'egg_collections' then 'Egg record (' || (j->>'session') || '): ' || (coalesce((j->>'good')::int,0) + coalesce((j->>'cracked')::int,0) + coalesce((j->>'rejected')::int,0)) || ' eggs'
    when 'mortality_logs' then (case j->>'kind' when 'cull' then 'Culls' else 'Deaths' end) || ': ' || (j->>'count') || ' bird(s)'
    when 'feed_stock' then 'Feed delivery: ' || (j->>'bags') || ' bags ' || (j->>'feed_type')
    when 'feed_usage' then 'Feed used: ' || (j->>'kg') || ' kg ' || (j->>'feed_type')
    when 'vaccination_schedule' then 'Vaccine scheduled: ' || (j->>'vaccine_name')
    when 'vaccination_records' then 'Vaccinated: ' || (j->>'vaccine_name')
    when 'treatments' then 'Treatment started: ' || (j->>'drug')
    when 'vet_visits' then 'Vet visit' || coalesce(' (' || (j->>'vet_name') || ')', '')
    when 'weight_logs' then 'Weight log: ' || (j->>'avg_weight_g') || ' g'
    else TG_TABLE_NAME
  end;
  insert into public.activity_log (user_id, entity, summary)
  values (coalesce(j->>'user_id', auth.uid()::text), TG_TABLE_NAME, v_summary);
  return null;
end;
$$;