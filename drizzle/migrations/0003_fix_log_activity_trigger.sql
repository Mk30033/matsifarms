create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary text;
begin
  if (TG_TABLE_NAME in ('pens','flocks')) and coalesce((to_jsonb(NEW)->>'is_sample')::boolean, false) then
    return null;
  end if;
  v_summary := case TG_TABLE_NAME
    when 'pens' then 'New pen: ' || NEW.name
    when 'flocks' then 'New flock: ' || NEW.name
    when 'egg_sessions' then 'Egg collection session (' || NEW.session || '), ' || to_char(NEW.date, 'DD Mon YYYY')
    when 'egg_collections' then 'Egg record (' || NEW.session || '): ' || (coalesce(NEW.good,0) + coalesce(NEW.cracked,0) + coalesce(NEW.rejected,0)) || ' eggs'
    when 'mortality_logs' then (case NEW.kind when 'cull' then 'Culls' else 'Deaths' end) || ': ' || NEW.count || ' bird(s)'
    when 'feed_stock' then 'Feed delivery: ' || NEW.bags || ' bags ' || NEW.feed_type
    when 'feed_usage' then 'Feed used: ' || NEW.kg || ' kg ' || NEW.feed_type
    when 'vaccination_schedule' then 'Vaccine scheduled: ' || NEW.vaccine_name
    when 'vaccination_records' then 'Vaccinated: ' || NEW.vaccine_name
    when 'treatments' then 'Treatment started: ' || NEW.drug
    when 'vet_visits' then 'Vet visit' || coalesce(' (' || NEW.vet_name || ')', '')
    when 'weight_logs' then 'Weight log: ' || NEW.avg_weight_g || ' g'
    else TG_TABLE_NAME
  end;
  insert into public.activity_log (user_id, entity, summary)
  values (coalesce(NEW.user_id, auth.uid()), TG_TABLE_NAME, v_summary);
  return null;
end;
$$;