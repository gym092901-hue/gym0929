create extension if not exists pgcrypto;

do $$ begin
  create type pet_type as enum ('dog', 'cat');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type reading_status as enum (
    'free_created',
    'payment_pending',
    'paid',
    'premium_created'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_provider as enum ('kakaopay', 'paypal');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type product_type as enum (
    'premium_report',
    'pdf_report',
    'guardian_match',
    'two_pet_match',
    'yearly_fortune'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum (
    'ready',
    'pending',
    'approved',
    'failed',
    'canceled',
    'refunded'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  type pet_type not null,
  birth_date date,
  birth_time time,
  birth_time_unknown boolean not null default false,
  adoption_date date,
  owner_email text not null check (owner_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  created_at timestamptz not null default now(),
  constraint pets_birth_time_consistency check (
    (birth_time_unknown = true and birth_time is null)
    or birth_time_unknown = false
  ),
  constraint pets_birth_or_adoption_date check (
    birth_date is not null or adoption_date is not null
  )
);

create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  free_summary text not null,
  premium_report text,
  status reading_status not null default 'free_created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references readings(id) on delete cascade,
  provider payment_provider not null,
  product_type product_type not null default 'premium_report',
  amount integer not null check (amount >= 0),
  currency char(3) not null default 'KRW',
  status payment_status not null default 'pending',
  provider_order_id text,
  provider_tid text,
  provider_payment_id text,
  partner_order_id text,
  partner_user_id text,
  approval_url text,
  cancel_url text,
  fail_url text,
  raw_request jsonb,
  raw_response jsonb,
  approved_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_type product_type not null unique,
  name text not null unique,
  price integer not null check (price >= 0),
  currency char(3) not null default 'KRW',
  description text not null default '',
  active boolean not null default true
);

drop trigger if exists set_readings_updated_at on readings;
create trigger set_readings_updated_at
before update on readings
for each row execute function set_updated_at();

drop trigger if exists set_payments_updated_at on payments;
create trigger set_payments_updated_at
before update on payments
for each row execute function set_updated_at();

create index if not exists pets_owner_email_idx on pets(owner_email);
create index if not exists readings_pet_id_idx on readings(pet_id);
create index if not exists readings_status_idx on readings(status);
create index if not exists payments_reading_id_idx on payments(reading_id);
create index if not exists payments_status_idx on payments(status);
create index if not exists payments_reading_product_status_idx
on payments(reading_id, product_type, status);
create index if not exists products_active_idx on products(active);

alter table pets enable row level security;
alter table readings enable row level security;
alter table payments enable row level security;
alter table products enable row level security;

insert into products (product_type, name, price, currency, description, active)
values
  ('premium_report', '프리미엄 사주 리포트', 2900, 'KRW', '반려동물의 성향, 보호자와의 관계, 생활 루틴을 자세히 읽는 심층 리포트', true),
  ('guardian_match', '보호자와 우리 아이 궁합 리포트', 1000, 'KRW', '보호자와 반려동물의 관계 스타일을 다정하게 읽는 추가 리포트', true),
  ('two_pet_match', '두 마리 궁합 리포트', 1000, 'KRW', '두 반려동물의 관계 흐름과 생활 공간 조율 포인트', true),
  ('yearly_fortune', '2026년 연간 흐름 리포트', 1000, 'KRW', '2026년의 계절별 생활 흐름과 월별 조언', true),
  ('pdf_report', 'PDF로 저장하기', 0, 'KRW', '심층 리포트를 열람한 보호자에게 무료로 제공되는 PDF 저장 기능', true)
on conflict do nothing;
