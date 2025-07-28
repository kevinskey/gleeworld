-- Fix function search paths for security
DROP FUNCTION IF EXISTS public.encrypt_square_token(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_square_token(TEXT);

CREATE OR REPLACE FUNCTION public.encrypt_square_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- In production, you'd use proper encryption with pg_crypto
  -- For now, we'll store tokens as-is but this function provides the structure
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_square_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- In production, you'd use proper decryption with pg_crypto
  -- For now, we'll return tokens as-is but this function provides the structure
  RETURN encrypted_token;
END;
$$;