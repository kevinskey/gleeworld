-- Command Center feed: stop baking a UTC-rendered clock time into the
-- schedule detail for gw_events rows — the client formats event_at in
-- the viewer's timezone (the 'Up next 6:00 PM / 10:00 PM' mismatch).
-- Detail now carries only the location. Class-session branch keeps its
-- to_char: those are naive wall times, rendered as intended.
CREATE OR REPLACE VIEW public.v_command_center_feed AS
 SELECT 'urgent_task'::text AS section,
    'missing_attendance'::text AS subtype,
    'miss-att-'::text || s.id::text AS id,
    'Attendance not taken'::text AS title,
    (((c.course_code::text || ' \u2014 '::text) || COALESCE(s.title, c.title::character varying)::text) || ' on '::text) || to_char(s.session_date::timestamp with time zone, 'Mon DD'::text) AS detail,
    ((s.session_date + COALESCE(s.start_time, '00:00:00'::time without time zone)) AT TIME ZONE 'UTC'::text) AS event_at,
        CASE
            WHEN s.session_date < (CURRENT_DATE - 7) THEN 'high'::text
            WHEN s.session_date < (CURRENT_DATE - 2) THEN 'medium'::text
            ELSE 'low'::text
        END AS severity,
    jsonb_build_object('course_id', s.course_id, 'session_id', s.id, 'session_date', s.session_date, 'location', s.location) AS meta
   FROM gw_course_class_sessions s
     JOIN gw_courses c ON c.id = s.course_id
  WHERE s.tenant_id = current_tenant_id() AND s.attendance_required = true AND s.session_date <= CURRENT_DATE AND s.session_date >= (CURRENT_DATE - 14) AND NOT (EXISTS ( SELECT 1
           FROM gw_course_attendance a
          WHERE a.course_id = s.course_id AND a.attendance_date = s.session_date AND a.tenant_id = current_tenant_id()))
UNION ALL
 SELECT 'urgent_task'::text AS section,
    'unread_messages'::text AS subtype,
    'unread-'::text || conv.id::text AS id,
        CASE
            WHEN count(m.*) = 1 THEN '1 unread message'::text
            ELSE count(m.*)::text || ' unread messages'::text
        END AS title,
    'Conversation with '::text || COALESCE(( SELECT p.full_name
           FROM gw_profiles p
          WHERE p.user_id =
                CASE
                    WHEN conv.participant_1 = auth.uid() THEN conv.participant_2
                    ELSE conv.participant_1
                END
         LIMIT 1), 'a teammate'::text) AS detail,
    max(m.created_at) AS event_at,
        CASE
            WHEN count(m.*) >= 5 THEN 'high'::text
            WHEN count(m.*) >= 2 THEN 'medium'::text
            ELSE 'low'::text
        END AS severity,
    jsonb_build_object('conversation_id', conv.id, 'unread_count', count(m.*)) AS meta
   FROM dm_conversations conv
     JOIN dm_messages m ON m.conversation_id = conv.id AND m.tenant_id = current_tenant_id() AND m.read = false AND m.sender_id <> auth.uid()
  WHERE conv.tenant_id = current_tenant_id() AND (conv.participant_1 = auth.uid() OR conv.participant_2 = auth.uid())
  GROUP BY conv.id, conv.participant_1, conv.participant_2
UNION ALL
 SELECT 'schedule'::text AS section,
    'event'::text AS subtype,
    'event-'::text || e.id::text AS id,
    e.title,
    NULLIF(e.location, ''::text) AS detail,
    e.start_date AS event_at,
    NULL::text AS severity,
    jsonb_build_object('event_id', e.id, 'event_type', e.event_type, 'all_day', e.all_day, 'location', e.location, 'venue_name', e.venue_name, 'end_date', e.end_date) AS meta
   FROM gw_events e
  WHERE e.tenant_id = current_tenant_id() AND (e.start_date AT TIME ZONE 'UTC'::text)::date = CURRENT_DATE
UNION ALL
 SELECT 'schedule'::text AS section,
    'session'::text AS subtype,
    'session-'::text || s.id::text AS id,
    (c.course_code::text || ' \u2014 '::text) || COALESCE(s.title, c.title::character varying)::text AS title,
    to_char(s.start_time::interval, 'HH:MI AM'::text) || COALESCE(' \u2014 '::text || NULLIF(s.location::text, ''::text), ''::text) AS detail,
    ((s.session_date + COALESCE(s.start_time, '00:00:00'::time without time zone)) AT TIME ZONE 'UTC'::text) AS event_at,
    NULL::text AS severity,
    jsonb_build_object('course_id', s.course_id, 'session_id', s.id, 'session_type', s.session_type, 'location', s.location, 'end_time', s.end_time) AS meta
   FROM gw_course_class_sessions s
     JOIN gw_courses c ON c.id = s.course_id
  WHERE s.tenant_id = current_tenant_id() AND s.session_date = CURRENT_DATE
UNION ALL
 SELECT 'announcement'::text AS section,
    'announcement'::text AS subtype,
    'ann-'::text || a.id::text AS id,
    a.title,
    COALESCE("left"(a.content, 240), ''::text) AS detail,
    a.publish_date AS event_at,
    NULL::text AS severity,
    jsonb_build_object('announcement_id', a.id, 'author_id', a.created_by, 'author_name', ( SELECT COALESCE(p.full_name, p.email) AS "coalesce"
           FROM gw_profiles p
          WHERE p.user_id = a.created_by
         LIMIT 1), 'is_featured', a.is_featured, 'target_audience', a.target_audience) AS meta
   FROM gw_announcements a
  WHERE a.tenant_id = current_tenant_id() AND a.publish_date >= (now() - '14 days'::interval) AND a.publish_date <= now() AND (a.expire_date IS NULL OR a.expire_date > now());
