-- Add capacity and age range fields to rooms for occupancy dashboard.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS capacity int CHECK (capacity > 0),
  ADD COLUMN IF NOT EXISTS min_age_months int,
  ADD COLUMN IF NOT EXISTS max_age_months int;
