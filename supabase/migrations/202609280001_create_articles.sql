create table if not exists public.articles (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '',
  content text not null default '',
  cover_image text,
  publish_date timestamptz not null,
  views bigint not null default 0 check (views >= 0),
  shares bigint not null default 0 check (shares >= 0),
  status text not null check (status in ('published', 'draft')),
  category text,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_publish_date_idx
  on public.articles (status, publish_date desc);

alter table public.articles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create or replace function public.increment_article_views(p_article_id text)
returns table (views bigint, shares bigint)
language sql
security definer
set search_path = public
as $$
  update public.articles
  set views = articles.views + 1
  where id = p_article_id and status = 'published'
  returning articles.views, articles.shares;
$$;

create or replace function public.increment_article_shares(p_article_id text)
returns table (views bigint, shares bigint)
language sql
security definer
set search_path = public
as $$
  update public.articles
  set shares = articles.shares + 1
  where id = p_article_id and status = 'published'
  returning articles.views, articles.shares;
$$;

revoke execute on function public.increment_article_views(text) from public, anon, authenticated;
revoke execute on function public.increment_article_shares(text) from public, anon, authenticated;
grant execute on function public.increment_article_views(text) to service_role;
grant execute on function public.increment_article_shares(text) to service_role;
