-- Category trees: correct at any depth, capped at six levels.
--
-- The table is an adjacency list (`parent_id`) with a materialised path
-- (`path`) alongside — the right pairing for a shallow, read-heavy tree:
-- `parent_id` keeps writes simple and correct, `path` makes "everything under
-- this shelf" a prefix scan instead of a recursive CTE on every page view.
--
-- Four things were missing to make that pairing safe.
--
-- 1. **The cascade never fired on a rename.** `categories_cascade_path` was
--    declared `after update OF path`, and Postgres fires a column-scoped trigger
--    only when that column appears in the statement's SET list — not merely when
--    its value changes. The admin renames with `set name = ...`, so the BEFORE
--    trigger recomputed the row's own path and no descendant was ever touched.
--    Renaming "Food & Pantry" left its children reading
--    "Food & Pantry > Coffee & Tea" forever, which silently broke every prefix
--    query and every breadcrumb beneath it.
--
-- 2. **Nothing stopped a cycle.** `parent_id` could be pointed at the row's own
--    descendant, which makes the path recursion non-terminating.
--
-- 3. **Nothing bounded depth.** Unbounded nesting is a merchandising decision
--    made by accident; six is the ceiling agreed for this shop.
--
-- 4. **`>` was legal in a name**, which would corrupt a path that uses ' > ' as
--    its separator and cannot be parsed back.

-- ---------------------------------------------------------------- depth column
-- Denormalised so the cap, the ordering and the admin's guidance are all cheap,
-- and so a bad tree is visible in one query rather than by walking parents.
alter table categories add column if not exists depth int not null default 1;

comment on column categories.depth is
  'Levels from the root, counting from 1. Maintained by trigger; capped at 6.';

-- --------------------------------------------------------------- the ceiling
create or replace function public.category_max_depth()
returns int language sql immutable as $$ select 6 $$;

comment on function public.category_max_depth is
  'One place to change the ceiling. The admin reads the same number.';

-- ------------------------------------------------------------------ integrity
create or replace function public.maintain_category_path()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent_path  text;
  v_parent_depth int;
  v_ancestor     uuid;
  v_guard        int := 0;
begin
  if new.name is null or btrim(new.name) = '' then
    raise exception 'A category needs a name';
  end if;

  -- ' > ' is the path separator; a name containing it produces a path that
  -- cannot be split back into its parts.
  if position('>' in new.name) > 0 then
    raise exception 'A category name cannot contain ">"'
      using hint = 'It is reserved as the separator between levels.';
  end if;

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent';
    end if;

    -- Walk up from the proposed parent. Meeting this row means the move would
    -- close a loop, and the path recursion below would never terminate.
    v_ancestor := new.parent_id;
    while v_ancestor is not null loop
      v_guard := v_guard + 1;
      if v_guard > 100 then
        raise exception 'The category tree already contains a loop';
      end if;
      if v_ancestor = new.id then
        raise exception 'That would put % inside one of its own subcategories', new.name
          using hint = 'Choose a parent that is not beneath this category.';
      end if;
      select parent_id into v_ancestor from categories where id = v_ancestor;
    end loop;

    select path, depth into v_parent_path, v_parent_depth
      from categories where id = new.parent_id;

    if v_parent_path is null then
      raise exception 'Parent category does not exist';
    end if;

    new.path  := v_parent_path || ' > ' || new.name;
    new.depth := v_parent_depth + 1;
  else
    new.path  := new.name;
    new.depth := 1;
  end if;

  if new.depth > public.category_max_depth() then
    raise exception 'Categories can only go % levels deep', public.category_max_depth()
      using hint = 'Put this shelf higher up, or file the products directly.';
  end if;

  return new;
end $$;

-- ------------------------------------------------------------------- cascade
create or replace function public.cascade_category_path()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.path is distinct from old.path or new.depth is distinct from old.depth then
    -- Touching `path` re-runs the BEFORE trigger on each child, which recomputes
    -- it from this row and cascades on down. `where` restricts it to real
    -- children so an untouched branch is never rewritten.
    update categories
       set path = public.category_path_for(parent_id, name)
     where parent_id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists categories_cascade_path on categories;

-- No column list: a rename does not mention `path` in its SET list, and a
-- column-scoped trigger would not fire. The guard above makes the unconditional
-- version cheap — it stops as soon as nothing has actually changed.
create trigger categories_cascade_path
  after update on categories
  for each row execute function public.cascade_category_path();

-- ------------------------------------------------------------------- backfill
-- Existing rows predate the depth column and were written before the cap.
with recursive tree as (
  select id, 1 as depth from categories where parent_id is null
  union all
  select c.id, t.depth + 1 from categories c join tree t on c.parent_id = t.id
)
update categories c set depth = tree.depth from tree where tree.id = c.id;

-- ------------------------------------------------------------------- indexes
-- `path like 'Food & Pantry > %'` is the query behind every category page.
-- The default btree opclass cannot serve a prefix LIKE on a non-C collation.
create index if not exists categories_path_prefix_idx
  on categories (path text_pattern_ops);

create index if not exists categories_parent_depth_idx on categories (parent_id, sort_order);
