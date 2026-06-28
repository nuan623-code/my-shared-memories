
-- Public read for the resources bucket
CREATE POLICY "Public can read resources bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

-- Authenticated users can upload to resources bucket
CREATE POLICY "Authenticated users can upload to resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resources' AND owner = auth.uid());

CREATE POLICY "Owners can update their files in resources"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());

CREATE POLICY "Owners can delete their files in resources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resources' AND owner = auth.uid());
