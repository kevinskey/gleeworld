-- Task 6 follow-up: product -> DO Spaces object key for digital delivery.
-- store-download resolves this per entitlement's product_id to know which
-- object to presign; NULL means "no digital file" (function returns 404).
ALTER TABLE public.gw_products ADD COLUMN IF NOT EXISTS digital_object_key TEXT;
