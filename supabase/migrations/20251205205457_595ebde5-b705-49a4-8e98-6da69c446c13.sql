-- Drop existing policy and create restricted one for specific users only
DROP POLICY IF EXISTS "Exec board can update ticket requests" ON public.concert_ticket_requests;

CREATE POLICY "Only authorized users can update ticket requests"
ON public.concert_ticket_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    '4e6c2ec0-1f83-449a-a984-8920f6056ab5'::uuid,  -- Kevin (you)
    '0e26ecfb-7744-4052-b36e-76b3156596f3'::uuid,  -- Jordyn O'Neal
    '3577bc07-1ad3-4d4e-bc30-d401a1824874'::uuid   -- Ryan Ellis
  )
)
WITH CHECK (
  auth.uid() IN (
    '4e6c2ec0-1f83-449a-a984-8920f6056ab5'::uuid,  -- Kevin (you)
    '0e26ecfb-7744-4052-b36e-76b3156596f3'::uuid,  -- Jordyn O'Neal
    '3577bc07-1ad3-4d4e-bc30-d401a1824874'::uuid   -- Ryan Ellis
  )
);