-- Add policy to allow users to view their own templates
CREATE POLICY "Users can view their own templates"
ON email_templates
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);