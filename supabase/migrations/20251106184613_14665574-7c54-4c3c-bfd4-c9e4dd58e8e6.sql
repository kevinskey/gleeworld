-- Add policy to allow users to delete their own templates
CREATE POLICY "Users can delete their own templates"
ON email_templates
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);