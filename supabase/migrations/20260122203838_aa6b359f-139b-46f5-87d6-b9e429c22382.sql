-- Fix Spelman Blue theme contrast: background is dark blue, so foreground must be white
UPDATE theme_templates SET 
  color_foreground = '0 0% 100%',
  color_card_foreground = '0 0% 100%',
  color_muted_foreground = '0 0% 80%',
  color_card = '208 70% 40%'
WHERE id = 'spelman-blue';