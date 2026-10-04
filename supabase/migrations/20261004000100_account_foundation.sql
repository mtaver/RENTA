-- RENTA account foundation: profiles are user-managed; agency membership is trusted-only.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  is_landlord boolean not null default false,
  is_tenant boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_has_capability check (is_landlord or is_tenant)
);

create table public.agency_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('reviewer', 'administrator')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null
);

alter table public.profiles enable row level security;
alter table public.agency_staff enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.agency_staff from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, is_landlord, is_tenant) on table public.profiles to authenticated;
grant select on table public.agency_staff to authenticated;

create policy "users read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "users update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "staff read their own membership"
on public.agency_staff for select to authenticated
using ((select auth.uid()) = user_id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_landlord boolean;
  requested_tenant boolean;
begin
  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', 'RENTA user'));
  if char_length(requested_name) < 2 or char_length(requested_name) > 80 then
    requested_name := 'RENTA user';
  end if;

  requested_landlord := coalesce((new.raw_user_meta_data ->> 'is_landlord')::boolean, false);
  requested_tenant := coalesce((new.raw_user_meta_data ->> 'is_tenant')::boolean, true);
  if not requested_landlord and not requested_tenant then
    requested_tenant := true;
  end if;

  insert into public.profiles (user_id, display_name, is_landlord, is_tenant)
  values (new.id, requested_name, requested_landlord, requested_tenant);
  return new;
exception
  when invalid_text_representation then
    insert into public.profiles (user_id, display_name, is_landlord, is_tenant)
    values (new.id, requested_name, false, true);
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

comment on table public.agency_staff is 'Trusted agency membership. Never writable through the public client.';
