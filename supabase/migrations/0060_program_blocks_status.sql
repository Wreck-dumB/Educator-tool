-- Adds draft/published status and time-of-day block sorting to the program
-- planner, so a drafted program can be edited into blocks of the day (e.g.
-- Morning Tea, Lunch, Rest) and explicitly published before being turned
-- into a printable weekly calendar for display in the room.

alter table public.programs
  add column status text not null default 'draft' check (status in ('draft', 'published')),
  add column blocks jsonb not null default '[
    {"key": "arrival", "label": "Arrival & Free Play"},
    {"key": "group_time", "label": "Morning Group Time"},
    {"key": "indoor_outdoor", "label": "Indoor / Outdoor Play"},
    {"key": "morning_tea", "label": "Morning Tea"},
    {"key": "lunch", "label": "Lunch"},
    {"key": "rest", "label": "Rest / Quiet Time"},
    {"key": "afternoon_tea", "label": "Afternoon Tea"},
    {"key": "home_time", "label": "Home Time"}
  ]'::jsonb;

alter table public.program_entries
  add column block_key text,
  add column order_index integer not null default 0;
