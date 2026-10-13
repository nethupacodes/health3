-- Run in Supabase SQL editor. Row Level Security: every user can only see and change their own rows.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_path text,
  age int check (age between 5 and 120), height_cm numeric check (height_cm between 50 and 250), weight_kg numeric check (weight_kg between 15 and 400),
  goals text[] default '{}', watch_brand text, watch_model text,
  water_goal_ml int check (water_goal_ml between 500 and 6000), step_goal int check (step_goal between 1000 and 100000),
  sleep_goal_min int check (sleep_goal_min between 180 and 840), active_goal_min int,
  ai_share_consent boolean not null default false,
  created_at timestamptz default now()
);
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  specialization text not null, phone text not null, clinic text not null,
  address text, notes text, photo_path text, created_at timestamptz default now()
);
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ml int not null check (ml between 10 and 3000), logged_at timestamptz not null default now()
);
create index on public.water_logs (user_id, logged_at desc);

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.water_logs enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own doctors" on public.doctors for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own water" on public.water_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile row on sign-up (works for email, Google and Facebook)
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'phone')
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Lets a signed-in user delete their own account (cascades to all rows above)
create function public.delete_my_account() returns void language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Private photo buckets, one folder per user
insert into storage.buckets (id, name, public) values ('avatars','avatars',false), ('doctor-photos','doctor-photos',false) on conflict do nothing;
create policy "own photos read" on storage.objects for select using (bucket_id in ('avatars','doctor-photos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert with check (bucket_id in ('avatars','doctor-photos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update using (bucket_id in ('avatars','doctor-photos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete using (bucket_id in ('avatars','doctor-photos') and (storage.foldername(name))[1] = auth.uid()::text);
