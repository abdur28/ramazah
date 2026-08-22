-- Stop the system abbreviating category names on its own.
--
-- `20260823000013` seeded `nav_label` with short forms — "Food & Pantry" as
-- "Food", "Veils & Scarves" as "Veils", "Home & Decor" as "Home" — and claimed
-- in its comment to be reproducing the curated menu. It was not: that menu
-- carried all three of those in full. The abbreviations were invented, and a
-- shop's own category names are not something the software gets to shorten
-- because a bar is running out of room.
--
-- `nav_label` stays, because a shopkeeper may genuinely want a shorter menu
-- label. It is now null by default, meaning "use the real name", and it is
-- editable from the category form. Fitting the bar is the bar's problem: it
-- measures itself and moves the overflow into "More".

update categories set nav_label = null
 where nav_label is not null
   and slug in (
     'veils-scarves', 'food-pantry', 'beauty-personal-care',
     'kitchen-dining', 'home-decor', 'school-stationery'
   );

comment on column categories.nav_label is
  'Optional shorter label for the menu. Null means use `name` — the default, '
  'because abbreviating a shop''s own categories is an editorial choice, not '
  'something to infer. The desktop bar overflows rather than truncating.';

-- `20260823000013` also hid everything below depth 2 from the menu. That was a
-- depth rule wearing a visibility column's clothes, and it now contradicts the
-- menu itself, which carries three levels. Depth is the menu's business
-- (`MENU_DEPTH`); `show_in_nav` is the shopkeeper's, for leaving a particular
-- shelf out. Reset it to the default and let each do its own job.
update categories set show_in_nav = true where show_in_nav = false;
