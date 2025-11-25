-- Create SMS conversations for all active message groups
INSERT INTO public.gw_sms_conversations (group_id, twilio_phone_number, is_active, created_at)
SELECT 
  id,
  '+18509930330', -- Your Twilio phone number
  true,
  now()
FROM public.gw_message_groups
WHERE is_active = true
AND id NOT IN (SELECT group_id FROM public.gw_sms_conversations WHERE group_id IS NOT NULL);