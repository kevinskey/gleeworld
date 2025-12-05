-- Update policy to use Rayne Stewart instead of Ryan Ellis
DROP POLICY IF EXISTS "Only authorized users can update ticket requests" ON public.concert_ticket_requests;

CREATE POLICY "Only authorized users can update ticket requests"
ON public.concert_ticket_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    '4e6c2ec0-1f83-449a-a984-8920f6056ab5'::uuid,  -- Kevin
    '0e26ecfb-7744-4052-b36e-76b3156596f3'::uuid,  -- Jordyn O'Neal
    '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81'::uuid   -- Rayne Stewart
  )
)
WITH CHECK (
  auth.uid() IN (
    '4e6c2ec0-1f83-449a-a984-8920f6056ab5'::uuid,  -- Kevin
    '0e26ecfb-7744-4052-b36e-76b3156596f3'::uuid,  -- Jordyn O'Neal
    '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81'::uuid   -- Rayne Stewart
  )
);