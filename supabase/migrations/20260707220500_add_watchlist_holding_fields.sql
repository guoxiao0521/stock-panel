alter table stock_panel.watchlist_items
  add column if not exists cost_price numeric(20,6),
  add column if not exists share_count numeric(20,6);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'watchlist_items_cost_price_positive'
      and conrelid = 'stock_panel.watchlist_items'::regclass
  ) then
    alter table stock_panel.watchlist_items
      add constraint watchlist_items_cost_price_positive
      check (cost_price is null or cost_price > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'watchlist_items_share_count_positive'
      and conrelid = 'stock_panel.watchlist_items'::regclass
  ) then
    alter table stock_panel.watchlist_items
      add constraint watchlist_items_share_count_positive
      check (share_count is null or share_count > 0);
  end if;
end $$;
