-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enum for meal type
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'meal_type'
  ) then
    create type meal_type as enum ('cook', 'eat_out');
  end if;
end$$;

-- NextAuth adapter tables (users handled by NextAuth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  id_token text,
  scope text,
  session_state text,
  token_type text,
  unique (provider, "providerAccountId")
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text not null unique,
  "userId" uuid not null references public.users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists public.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

create table if not exists public.phone_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Meals table
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type meal_type not null,
  category text not null default 'Khác',
  estimated_cost numeric(12,2) not null check (estimated_cost >= 0),
  calories integer not null check (calories >= 0),
  protein integer not null check (protein >= 0),
  benefits text[] not null default '{}',
  ingredients text[] not null default '{}',
  health_warning text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.meals
  add column if not exists image_url text;

alter table public.meals
  add column if not exists benefits text[] not null default '{}';

alter table public.meals
  add column if not exists category text not null default 'Khác';

update public.meals
set benefits = ingredients
where (benefits is null or array_length(benefits, 1) is null)
  and array_length(ingredients, 1) is not null;

update public.meals
set category = 'Khác'
where category is null or btrim(category) = '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-images',
  'meal-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  actual_cost numeric(12,2) check (actual_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_meals_user_id on public.meals(user_id);
create index if not exists idx_reviews_meal_id on public.reviews(meal_id);
create index if not exists idx_phone_credentials_phone on public.phone_credentials(phone);

alter table public.meals enable row level security;
alter table public.reviews enable row level security;

-- Meals policies
drop policy if exists "Users can read own meals" on public.meals;
create policy "Users can read own meals"
  on public.meals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own meals" on public.meals;
create policy "Users can insert own meals"
  on public.meals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own meals" on public.meals;
create policy "Users can update own meals"
  on public.meals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own meals" on public.meals;
create policy "Users can delete own meals"
  on public.meals
  for delete
  using (auth.uid() = user_id);

-- Reviews policies (reviews belonging to meals owned by current user)
drop policy if exists "Users can read reviews of own meals" on public.reviews;
create policy "Users can read reviews of own meals"
  on public.reviews
  for select
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert reviews for own meals" on public.reviews;
create policy "Users can insert reviews for own meals"
  on public.reviews
  for insert
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update reviews for own meals" on public.reviews;
create policy "Users can update reviews for own meals"
  on public.reviews
  for update
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete reviews for own meals" on public.reviews;
create policy "Users can delete reviews for own meals"
  on public.reviews
  for delete
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_id
        and m.user_id = auth.uid()
    )
  );
