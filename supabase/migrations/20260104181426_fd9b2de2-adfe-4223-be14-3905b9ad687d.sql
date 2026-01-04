-- Fix foreground colors for proper contrast
-- Dark themes should have light text (white), Light themes should have dark text (near-black)

-- Spelman Blue is a LIGHT theme, so it needs DARK text
UPDATE theme_templates SET 
  color_foreground = '0 0% 10%',
  color_card_foreground = '0 0% 10%',
  color_muted_foreground = '0 0% 40%'
WHERE id = 'spelman-blue';

-- SpelHouse is also a LIGHT theme, keep the maroon text but ensure good contrast
UPDATE theme_templates SET 
  color_foreground = '352 65% 15%',
  color_card_foreground = '352 65% 15%',
  color_muted_foreground = '352 30% 40%'
WHERE id = 'spelhouse';