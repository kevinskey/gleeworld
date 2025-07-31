-- Create a function to insert performance scores
CREATE OR REPLACE FUNCTION public.insert_performance_score(
  p_performer_id UUID,
  p_performer_name TEXT,
  p_evaluator_id UUID,
  p_event_type TEXT,
  p_categories TEXT,
  p_total_score INTEGER,
  p_max_score INTEGER,
  p_percentage DECIMAL(5,2),
  p_overall_score INTEGER,
  p_comments TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  score_id UUID;
BEGIN
  INSERT INTO public.gw_performance_scores (
    performer_id,
    performer_name,
    evaluator_id,
    event_type,
    categories,
    total_score,
    max_score,
    percentage,
    overall_score,
    comments
  ) VALUES (
    p_performer_id,
    p_performer_name,
    p_evaluator_id,
    p_event_type,
    p_categories::jsonb,
    p_total_score,
    p_max_score,
    p_percentage,
    p_overall_score,
    p_comments
  ) RETURNING id INTO score_id;
  
  RETURN score_id;
END;
$$;