alter table public.pets
  add column if not exists living_environment text[] not null default '{}',
  add column if not exists daily_activity_frequency text,
  add column if not exists alone_time text,
  add column if not exists stranger_reaction text,
  add column if not exists guardian_distance text,
  add column if not exists favorite_activities text[] not null default '{}',
  add column if not exists guardian_questions text[] not null default '{}';
