-- What each customer is worth, counted for the customers on screen.
--
-- `getCustomerStats()` selected every order in the shop - `user_id, total,
-- currency, status, payment_status, created_at`, no limit - and aggregated them
-- in the browser to fill in two columns on the customers list.
--
-- That is the same shape as the bug in the Mailer (20260829000034), and it
-- fails the same way: **PostgREST caps an unbounded select at 1000 rows**, so
-- once the shop passes a thousand orders the lifetime spend on this screen
-- quietly stops counting. Not an error, not a blank - a number that is too low
-- and looks perfectly reasonable. The best customer in the shop would show as
-- an average one.
--
-- Paging the list makes it worse in the other direction too: fifty customers
-- are on screen and every order in the shop was being fetched to decorate them.
--
-- Aggregated here, for the ids being shown. Both problems, one query.
create or replace function public.customer_stats(p_ids uuid[])
returns table (
  user_id       uuid,
  order_count   int,
  spend         numeric,
  currency      text,
  last_order_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  select o.user_id,
         count(*)::int,
         -- Cancelled and refunded orders count toward the tally but not toward
         -- what the customer has actually spent. Same rule as before, moved.
         coalesce(sum(o.total) filter (
           where o.payment_status = 'paid' and o.status <> 'refunded'
         ), 0),
         coalesce(max(o.currency::text), 'NGN'),
         max(o.created_at)
    from orders o
   where o.user_id = any(p_ids)
   group by o.user_id;
$$;

comment on function public.customer_stats(uuid[]) is
  'Order count, lifetime spend and last order date for the given customers.';

grant execute on function public.customer_stats(uuid[]) to authenticated;
