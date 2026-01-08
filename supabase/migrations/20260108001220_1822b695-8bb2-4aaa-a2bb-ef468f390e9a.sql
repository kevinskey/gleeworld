-- Clean all poll data from the system
-- Delete in order respecting foreign key constraints

-- First delete poll votes (references poll_options and polls)
DELETE FROM gw_poll_votes;

-- Delete poll options (references polls)
DELETE FROM gw_poll_options;

-- Delete polls (references group messages)
DELETE FROM gw_polls;

-- Delete poll-type messages from group messages
DELETE FROM gw_group_messages WHERE message_type = 'poll';