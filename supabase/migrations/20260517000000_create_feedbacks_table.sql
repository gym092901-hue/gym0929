create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  tester_name text check (tester_name is null or char_length(trim(tester_name)) <= 80),
  contact text check (contact is null or char_length(trim(contact)) <= 120),
  pet_type pet_type,
  page text not null default 'test' check (char_length(trim(page)) between 1 and 120),
  rating integer not null check (rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 5 and 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feedbacks_created_at_idx on feedbacks(created_at desc);
create index if not exists feedbacks_rating_idx on feedbacks(rating);

alter table feedbacks enable row level security;
