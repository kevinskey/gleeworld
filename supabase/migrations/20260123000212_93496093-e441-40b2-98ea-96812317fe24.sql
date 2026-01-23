-- Delete orphan replies (those created before threading was implemented)
DELETE FROM public.discussion_replies 
WHERE parent_reply_id IS NULL;