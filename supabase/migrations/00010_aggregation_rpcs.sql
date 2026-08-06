-- ============================================================
-- Migration 00010: Agregações no Postgres em vez de JS (06/08/2026)
-- Execute APÓS 00009_atomic_product_order.sql
--
-- admin/page.tsx, admin/financeiro/page.tsx e professor/faturamento/page.tsx
-- puxavam a tabela inteira de enrollments (ou todo teacher_payouts) só pra
-- somar em JS — ok com dezenas de linhas, cai de desempenho com milhares.
-- As três funções abaixo fazem a soma no banco; a página só recebe o
-- resultado agregado.
-- ============================================================

-- ------------------------------------------------------------
-- Dashboard do admin: 5 queries (4 counts + 1 sum de enrollments
-- inteiro) viram 1 round trip. Dados agregados de toda a plataforma —
-- restrito a admin, já que security definer ignora RLS.
-- ------------------------------------------------------------
create or replace function public.get_admin_dashboard_stats()
returns table (
  total_courses bigint,
  pending_courses bigint,
  total_teachers bigint,
  total_students bigint,
  total_revenue numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    (select count(*) from public.courses where status = 'approved'),
    (select count(*) from public.courses where status = 'pending_review'),
    (select count(*) from public.profiles where role = 'teacher'),
    (select count(*) from public.profiles where role = 'student'),
    coalesce((select sum(amount_paid) from public.enrollments), 0);
end;
$$;

-- ------------------------------------------------------------
-- Financeiro do admin: totais de verdade (não só a soma dos últimos 20
-- payouts que o `.limit(20)` da tela deixava passar por "total").
-- ------------------------------------------------------------
create or replace function public.get_admin_financial_totals()
returns table (total_gross numeric, total_payouts numeric, total_sales bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    coalesce((select sum(amount_paid) from public.enrollments), 0),
    coalesce((select sum(amount) from public.teacher_payouts), 0),
    (select count(*) from public.enrollments);
end;
$$;

-- Receita mensal (últimos N meses) pro gráfico de barras — antes era um
-- reduce em JS sobre todas as enrollments só pra agrupar por mês.
create or replace function public.get_admin_monthly_revenue(months_back int default 6)
returns table (month text, total numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select to_char(date_trunc('month', e.created_at), 'YYYY-MM') as month,
         sum(e.amount_paid) as total
  from public.enrollments e
  where e.created_at >= date_trunc('month', now()) - ((months_back - 1) || ' months')::interval
  group by 1
  order by 1;
end;
$$;

-- ------------------------------------------------------------
-- Faturamento do professor: receita por curso, agrupada no banco.
-- `security invoker` (padrão) — sem bypass de RLS — e o filtro por
-- `auth.uid()` é interno à query, não um parâmetro vindo do client, então
-- não tem como pedir os dados de outro professor trocando um argumento.
-- Total, líquido e contagem de vendas a página deriva somando as linhas
-- retornadas (poucas linhas — uma por curso — em vez de uma por matrícula).
-- ------------------------------------------------------------
create or replace function public.get_my_teacher_revenue_by_course()
returns table (course_id uuid, title text, sale_count bigint, gross numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select c.id, c.title, count(e.id), coalesce(sum(e.amount_paid), 0)
  from public.courses c
  left join public.enrollments e on e.course_id = c.id
  where c.teacher_id = (select auth.uid())
  group by c.id, c.title
  order by coalesce(sum(e.amount_paid), 0) desc;
$$;
