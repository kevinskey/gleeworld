-- Concert Planner — expand the theme enum from 3 to 8 hand-curated
-- "gamma-style" themes. Each theme is a typography + palette + hero
-- backdrop bundle defined in the React themeClasses() helper; the DB
-- only needs to accept the new string identifiers.

ALTER TABLE public.gw_concert_programs
  DROP CONSTRAINT IF EXISTS gw_concert_programs_theme_check;

ALTER TABLE public.gw_concert_programs
  ADD CONSTRAINT gw_concert_programs_theme_check CHECK (theme IN (
    'classic-concert',     -- amber + Playfair serif (kept)
    'modern-show',         -- cyan + zinc dark (kept)
    'chamber-minimalist',  -- stone + JetBrains mono (kept)
    'cathedral',           -- burgundy + Cinzel display
    'sunset-recital',      -- peach gradient + Cormorant
    'jazz-club',           -- electric blue + Bebas Neue
    'spring-pastoral',     -- sage + Cormorant + Open Sans
    'black-tie'            -- onyx + gold + Cinzel
  ));

NOTIFY pgrst, 'reload schema';
