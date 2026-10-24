create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);

grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;

alter table public.activity_log enable row level security;

create policy "admins can read all activity"
on public.activity_log for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "users can read own activity"
on public.activity_log for select to authenticated
using (user_id = auth.uid());

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary text;
begin
  if (TG_TABLE_NAME in ('pens','flocks')) and NEW.is_sample then
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

revoke execute on function public.log_activity() from anon, authenticated, public;

create trigger log_activity_pens after insert on public.pens for each row execute function public.log_activity();
create trigger log_activity_flocks after insert on public.flocks for each row execute function public.log_activity();
create trigger log_activity_egg_sessions after insert on public.egg_sessions for each row execute function public.log_activity();
create trigger log_activity_egg_collections after insert on public.egg_collections for each row execute function public.log_activity();
create trigger log_activity_mortality after insert on public.mortality_logs for each row execute function public.log_activity();
create trigger log_activity_feed_stock after insert on public.feed_stock for each row execute function public.log_activity();
create trigger log_activity_feed_usage after insert on public.feed_usage for each row execute function public.log_activity();
create trigger log_activity_vaccination_schedule after insert on public.vaccination_schedule for each row execute function public.log_activity();
create trigger log_activity_vaccination_records after insert on public.vaccination_records for each row execute function public.log_activity();
create trigger log_activity_treatments after insert on public.treatments for each row execute function public.log_activity();
create trigger log_activity_vet_visits after insert on public.vet_visits for each row execute function public.log_activity();
create trigger log_activity_weight_logs after insert on public.weight_logs for each row execute function public.log_activity();
