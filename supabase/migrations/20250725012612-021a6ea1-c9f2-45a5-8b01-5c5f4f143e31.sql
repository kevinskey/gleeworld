-- Add fields for secretary messages to excuse requests
ALTER TABLE excuse_requests 
ADD COLUMN secretary_message TEXT,
ADD COLUMN secretary_message_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN secretary_message_sent_by UUID REFERENCES auth.users(id);