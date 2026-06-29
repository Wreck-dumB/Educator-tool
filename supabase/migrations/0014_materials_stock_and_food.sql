-- Extends materials into a lightweight stock list (quantity/unit/low-stock
-- threshold) and adds a 'food' category alongside the existing classroom
-- materials, so the same saved list can back both the activity generator's
-- "what I have" input and the new recipe generator's pantry input.
--
-- quantity/low_stock_threshold are nullable -- not every material needs
-- stock tracking (e.g. "cardboard boxes, donated ad-hoc" doesn't need a
-- count); a material only shows as low-stock once the educator has
-- explicitly set both a quantity and a threshold for it.
--
-- Notification is in-app only for now (a visual indicator on the Materials
-- page) -- a real email/push alert would need a transactional email
-- service added as its own piece of infrastructure, not just a code change,
-- and wasn't requested for this pass.
alter table public.materials
  add column category text not null default 'classroom' check (category in ('classroom', 'food')),
  add column quantity numeric,
  add column unit text,
  add column low_stock_threshold numeric;
