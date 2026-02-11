-- Fix Faith Formation events: shift from Wednesday (UTC Thursday midnight) to Thursday (UTC Friday midnight)
UPDATE events 
SET start_date = start_date + interval '1 day', 
    end_date = end_date + interval '1 day' 
WHERE title ILIKE '%faith%formation%' 
  AND extract(dow from start_date) = 4;