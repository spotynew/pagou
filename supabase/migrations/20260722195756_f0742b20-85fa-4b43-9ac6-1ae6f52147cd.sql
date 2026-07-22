
-- RLS on storage.objects for event-covers bucket
-- Path convention: <seller_id>/<file>
-- Public read; producer manages files inside their own seller folder.

CREATE POLICY "event_covers_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-covers');

CREATE POLICY "event_covers_producer_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.seller_accounts s
    WHERE s.user_id = auth.uid()
      AND s.status = 'approved'
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "event_covers_producer_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.seller_accounts s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.seller_accounts s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "event_covers_producer_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.seller_accounts s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
  )
);
