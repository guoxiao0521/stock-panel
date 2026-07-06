alter table stock_panel.quote_snapshots
  add column if not exists nav_price double precision,
  add column if not exists premium_discount_percent double precision;
