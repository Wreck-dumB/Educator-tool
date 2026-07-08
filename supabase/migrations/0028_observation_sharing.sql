-- Observation sharing with linked parents.
-- Each observation requires explicit per-observation approval before a linked
-- parent can see it. Parents ONLY read via get_shared_observations() security-
-- definer function -- not direct table access -- so no future copy-paste of
-- the educator-side query can accidentally expose unshared observations.

-- Add sharing columns
ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS shared_with_parent_at timestamptz,
  ADD COLUMN IF NOT EXISTS shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS observations_shared_idx
  ON public.observations (child_id, shared_with_parent_at)
  WHERE shared_with_parent_at IS NOT NULL;

-- The only path a parent JWT can use to read observations.
-- Does NOT expose generated_activities or observation_eylf_links directly --
-- only the activity title flows through, never steps/materials/reflections.
CREATE OR REPLACE FUNCTION public.get_shared_observations(_child_id uuid)
RETURNS TABLE (
  id uuid,
  note_text text,
  observed_at timestamptz,
  photo_url text,
  activity_title text,
  eylf_codes text[],
  shared_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_linked_parent(_child_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.note_text,
    o.observed_at,
    o.photo_url,
    a.title AS activity_title,
    COALESCE(
      ARRAY_AGG(DISTINCT e.code) FILTER (WHERE e.code IS NOT NULL),
      '{}'::text[]
    ) AS eylf_codes,
    o.shared_with_parent_at AS shared_at
  FROM public.observations o
  LEFT JOIN public.generated_activities a ON a.id = o.activity_id
  LEFT JOIN public.observation_eylf_links l ON l.observation_id = o.id
  LEFT JOIN public.eylf_outcomes e ON e.id = l.eylf_outcome_id
  WHERE o.child_id = _child_id
    AND o.shared_with_parent_at IS NOT NULL
  GROUP BY
    o.id, o.note_text, o.observed_at, o.photo_url,
    a.title, o.shared_with_parent_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_observations(uuid) TO authenticated;
