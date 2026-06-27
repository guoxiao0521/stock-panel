create schema if not exists stock_panel;

revoke all on schema stock_panel from public;
revoke all on schema stock_panel from anon;
revoke all on schema stock_panel from authenticated;

create table if not exists stock_panel."user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists stock_panel."session" (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references stock_panel."user"(id) on delete cascade
);

create table if not exists stock_panel."account" (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references stock_panel."user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists stock_panel."verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists session_user_id_idx on stock_panel."session"("userId");
create index if not exists account_user_id_idx on stock_panel."account"("userId");
create index if not exists verification_identifier_idx on stock_panel."verification"(identifier);

create table if not exists stock_panel.watchlists (
  id text primary key,
  name text not null,
  user_id text,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_watchlists_user on stock_panel.watchlists(user_id);
create unique index if not exists idx_watchlists_user_unique
  on stock_panel.watchlists(user_id)
  where user_id is not null;

create table if not exists stock_panel.watchlist_items (
  id text primary key,
  watchlist_id text not null references stock_panel.watchlists(id) on delete cascade,
  symbol text not null,
  name text,
  exchange text,
  currency text,
  note text,
  tags_json jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create unique index if not exists idx_watchlist_items_symbol
  on stock_panel.watchlist_items(watchlist_id, symbol);

create table if not exists stock_panel.quote_snapshots (
  symbol text primary key,
  price double precision,
  change double precision,
  change_percent double precision,
  ytd_change_percent double precision,
  volume bigint,
  turnover_rate double precision,
  trailing_pe double precision,
  forward_pe double precision,
  market_cap bigint,
  quote_time text,
  fetched_at text,
  source text,
  error text,
  raw_json jsonb
);

create table if not exists stock_panel.macro_metric_snapshots (
  symbol text primary key,
  name text,
  value double precision,
  change double precision,
  change_percent double precision,
  quote_time text,
  fetched_at text,
  error text,
  error_at text,
  raw_json jsonb
);

insert into stock_panel.watchlists (id, name, created_at, updated_at)
values ('default', '默认自选股', now()::text, now()::text)
on conflict (id) do nothing;
