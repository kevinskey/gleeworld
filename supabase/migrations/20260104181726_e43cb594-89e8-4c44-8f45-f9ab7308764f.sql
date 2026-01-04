-- Make muted-foreground darker for better readability
-- Current: 0 0% 40% is too light on light backgrounds

UPDATE theme_templates SET 
  color_muted_foreground = '0 0% 30%'
WHERE id = 'spelman-blue';

-- Also ensure glee-world dark theme has visible muted text
UPDATE theme_templates SET 
  color_muted_foreground = '0 0% 75%'
WHERE id = 'glee-world';

-- Music studio theme
UPDATE theme_templates SET 
  color_muted_foreground = '0 0% 65%'
WHERE id = 'music';