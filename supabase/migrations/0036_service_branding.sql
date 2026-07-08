-- Centre branding: logo image + display name on the kiosk screen.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Director can update their own service record (name, logo, etc.)
CREATE POLICY "Director can update own service"
  ON public.services FOR UPDATE
  USING (director_user_id = auth.uid());

-- Active staff need to read the service record to display centre branding.
-- Drop and recreate in case it already exists from a prior migration.
DROP POLICY IF EXISTS "Active staff can view their service" ON public.services;
CREATE POLICY "Active staff can view their service"
  ON public.services FOR SELECT
  USING (public.has_service_role(director_user_id, 'staff'));

-- Public bucket: logos are displayed on the kiosk without auth (no sensitive content).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-logos',
  'service-logos',
  true,
  2097152, -- 2 MB max
  array['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public anyway, but explicit is better than implicit)
CREATE POLICY "Anyone can view service logo objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-logos');

-- Only the Director can upload/replace/delete their own logo.
-- Path convention: {director_user_id}/logo.{ext}
CREATE POLICY "Director can upload service logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-logos'
    AND name LIKE (auth.uid()::text || '/%')
    AND exists (
      SELECT 1 FROM public.services s WHERE s.director_user_id = auth.uid()
    )
  );

CREATE POLICY "Director can update service logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-logos'
    AND name LIKE (auth.uid()::text || '/%')
    AND exists (
      SELECT 1 FROM public.services s WHERE s.director_user_id = auth.uid()
    )
  );

CREATE POLICY "Director can delete service logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-logos'
    AND name LIKE (auth.uid()::text || '/%')
    AND exists (
      SELECT 1 FROM public.services s WHERE s.director_user_id = auth.uid()
    )
  );
