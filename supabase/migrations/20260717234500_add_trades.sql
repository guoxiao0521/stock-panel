create table if not exists stock_panel.trades (
  id text primary key,
  watchlist_id text not null references stock_panel.watchlists(id) on delete cascade,
  symbol text not null,
  side text not null,
  quantity numeric(20,6) not null,
  price numeric(20,6) not null,
  fee numeric(20,6) not null default 0,
  traded_at text not null,
  created_at text not null,
  updated_at text not null,
  constraint trades_side_check check (side in ('buy', 'sell')),
  constraint trades_quantity_positive check (quantity > 0),
  constraint trades_price_non_negative check (price >= 0),
  constraint trades_fee_non_negative check (fee >= 0)
);

create index if not exists idx_trades_watchlist_symbol_traded_at
  on stock_panel.trades (watchlist_id, symbol, traded_at);
