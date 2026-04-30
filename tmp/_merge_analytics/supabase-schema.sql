-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create users table
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'canceled')),
  stripe_customer_id text,
  subscription_id text
);

-- Create property_snapshots table
create table if not exists public.property_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  property_address text not null,
  property_data jsonb not null default '{}',
  calculation_inputs jsonb not null default '{}',
  calculation_results jsonb not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscriptions table
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  stripe_subscription_id text unique not null,
  status text not null check (status in ('active', 'inactive', 'canceled')),
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  plan_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists idx_property_snapshots_user_id on public.property_snapshots(user_id);
create index if not exists idx_property_snapshots_created_at on public.property_snapshots(created_at desc);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_id on public.subscriptions(stripe_subscription_id);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.property_snapshots enable row level security;
alter table public.subscriptions enable row level security;

-- Create RLS policies
-- Users can only see their own data
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Property snapshots policies
create policy "Users can view own property snapshots" on public.property_snapshots
  for select using (auth.uid() = user_id);

create policy "Users can insert own property snapshots" on public.property_snapshots
  for insert with check (auth.uid() = user_id);

create policy "Users can update own property snapshots" on public.property_snapshots
  for update using (auth.uid() = user_id);

create policy "Users can delete own property snapshots" on public.property_snapshots
  for delete using (auth.uid() = user_id);

-- Subscriptions policies
create policy "Users can view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Create function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user registration
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at_users
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_property_snapshots
  before update on public.property_snapshots
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();
