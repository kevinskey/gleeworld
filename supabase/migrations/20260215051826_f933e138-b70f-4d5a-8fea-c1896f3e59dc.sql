
-- Remove 19 MUS 070-only students from MUS 240 enrollment
DELETE FROM gw_course_enrollments
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND id IN (
    'f2d028cb-090e-4ca1-bae3-ca9051f0d0f8', -- Wilson, Nia M.
    '8ca777d2-7887-4285-902e-b8de1f5b629e', -- Armstrong, Arianna A.
    '5438ca81-d849-4234-865b-08b5bac0796f', -- Gaddis, Tolani
    'feef1a29-3d7e-4bad-b518-4b2ca76e45ab', -- Herring, Raven R.
    'dbabcb73-9c99-4e81-a461-eaaaa25d75d5', -- Rawles, Skye E.
    '419247e6-7f9e-4b47-8e86-7c548e394aba', -- Terry, Morgan A.
    '1733dda1-b921-44f1-8815-82f2658045cb', -- Tinsley, Rachael N.
    'a3f7c5c3-6bc2-42f4-b046-d1c6b3855c9e', -- Wilson, Khiara R.
    '34dccea3-eff0-4500-97a2-0ab19580184d', -- Adams, Karrington R.
    'b111ecb8-4fe0-4ca8-8954-0b819cdc40d6', -- Clifton, Zion G.
    'e413fe62-05bd-4d71-8dfb-c0bd0d795a73', -- Henderson, Kennedi J.
    '51e4e0e9-e001-4cda-b766-2290cf27bc95', -- Lawson, Rebekah G.
    'd407369d-1c82-4cc7-a1db-abd8241cdcbd', -- Robinson, Journi M.
    '13511ec8-af74-4566-8527-28f69afc8756', -- Williams, Ainka-Amara M.
    '35edc466-cffc-45f4-b312-2e28705dfdaf', -- Lorna Morris
    '0d7b650d-c64c-4bd2-a1be-730c29dabd81', -- Taylor Gamble
    '7f00cd90-a343-45d9-b100-44ee353061c2', -- Rylee McGee
    '6a78dccc-26ce-48f8-a218-35298caf39c3', -- Leilani Dacus
    '9964e722-3350-4e76-8e41-0787a5ba04f9'  -- Sarah Brown
  );
