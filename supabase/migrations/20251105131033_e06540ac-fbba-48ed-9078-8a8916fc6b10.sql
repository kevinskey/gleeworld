-- Add tags column to gw_internal_messages
ALTER TABLE gw_internal_messages 
ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create an index for better tag filtering performance
CREATE INDEX idx_gw_internal_messages_tags ON gw_internal_messages USING GIN(tags);