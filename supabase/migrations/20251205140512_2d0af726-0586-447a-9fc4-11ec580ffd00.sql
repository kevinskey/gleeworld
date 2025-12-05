
-- Transfer Kaylana Barnes events from gmail to spelman account
UPDATE gw_events SET created_by = 'b2476088-ba0a-41cf-b8cd-ac20d1594c2a' 
WHERE created_by = 'b4eaed0e-6fe7-4060-90d9-2d96a604f404';

-- Delete older duplicate accounts, keeping spelman.edu accounts
DELETE FROM gw_profiles WHERE email = 'afiaamoakoboateng@gmail.com';
DELETE FROM gw_profiles WHERE email = 'ahbrigraves@gmail.com';
DELETE FROM gw_profiles WHERE email = 'russellava12@gmail.com';
DELETE FROM gw_profiles WHERE email = 'jadaelyse06@gmail.com';
DELETE FROM gw_profiles WHERE email = 'jailah.teamshepherd@gmail.com';
DELETE FROM gw_profiles WHERE email = 'Jjmarsh27@gmail.com';
DELETE FROM gw_profiles WHERE email = 'kathryn.tucker2003@gmail.com';
DELETE FROM gw_profiles WHERE email = 'kaylana.barnes@gmail.com';
DELETE FROM gw_profiles WHERE email = 'kendallgrace.felton@gmail.com';
DELETE FROM gw_profiles WHERE email = 'whitelauryn41@gmail.com';
DELETE FROM gw_profiles WHERE email = 'namadd005@gmail.com';
DELETE FROM gw_profiles WHERE email = 'mageetwin2@gmail.com';

-- Camryn Williams: keep camrynjwilliams@spelman.edu, delete other two
DELETE FROM gw_profiles WHERE email = 'camrynwilliams2@spelman.edu';
DELETE FROM gw_profiles WHERE email = 'camrynjoelle06@gmail.com';

-- Elissa Jefferson: keep spelman, delete both gmail accounts
DELETE FROM gw_profiles WHERE email = 'elissamj03@gmail.com';
DELETE FROM gw_profiles WHERE email = 'thtgurl223.2@gmail.com';

-- Samirah Love Mungin: keep newer spelman6, delete older
DELETE FROM gw_profiles WHERE email = 'samirahmungin@spelman.edu';

-- Sanaia Harrison: keep newer gmail, delete icloud
DELETE FROM gw_profiles WHERE email = 'sanaiaharrison@icloud.com';

-- Soleil Vailes: keep spelman, delete gmail
DELETE FROM gw_profiles WHERE email = 'soleilvailes111@gmail.com';

-- Wambui Kennedy: keep spelman, delete gmail
DELETE FROM gw_profiles WHERE email = 'wambuiken07@gmail.com';
