-- Add canvas_json to posters for the new Fabric.js interactive editor.
-- Old posters (canvas_json IS NULL) continue to render via PosterView (HTML).
-- New posters (canvas_json IS NOT NULL) render via the Fabric canvas editor.
ALTER TABLE public.posters ADD COLUMN IF NOT EXISTS canvas_json jsonb;
