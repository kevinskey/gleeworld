-- Add responsorial psalm musicxml field to liturgical worksheets
ALTER TABLE liturgical_worksheets 
ADD COLUMN responsorial_psalm_musicxml TEXT;