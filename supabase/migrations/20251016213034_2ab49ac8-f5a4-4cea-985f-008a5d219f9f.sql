-- Create new bucket with neutral name to avoid ad blockers
INSERT INTO storage.buckets (id, name, public)
VALUES ('alumnae-docs', 'alumnae-docs', true)
ON CONFLICT (id) DO NOTHING;