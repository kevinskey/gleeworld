-- Create a profile for the current user
INSERT INTO public.profiles (id, email, role, full_name)
SELECT auth.uid(), 
       (SELECT email FROM auth.users WHERE id = auth.uid()),
       'admin', 
       'Admin User'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());