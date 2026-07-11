-- Two more system templates for the Planner: liturgy planning (order of
-- service/Mass with music slots) and concert program planning (program
-- order + notes; the existing "Concert production plan" stays focused on
-- logistics). Idempotent via the partial unique index on (name) WHERE
-- is_system (gw_planner_templates_system_name_uq).
INSERT INTO public.gw_planner_templates
  (tenant_id, user_id, is_system, name, description, note_type, content, content_md)
VALUES
(NULL, NULL, true, 'Liturgy plan', 'Order of service with music slots, readings, personnel, and follow-ups.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Liturgy — {{date}}"}]},
   {"type":"paragraph","content":[{"type":"text","text":"Feast / Sunday: "}]},
   {"type":"paragraph","content":[{"type":"text","text":"Season: "},{"type":"text","text":"    Liturgical color: "}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Music"}]},
   {"type":"bulletList","content":[
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Prelude: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Entrance / Processional: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Kyrie: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Gloria: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Responsorial Psalm: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Gospel Acclamation: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Offertory / Anthem: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sanctus: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Memorial Acclamation / Great Amen: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Agnus Dei: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Communion: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Recessional / Postlude: "}]}]}
   ]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Readings"}]},
   {"type":"bulletList","content":[
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"First reading: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Psalm: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Second reading: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Gospel: "}]}]}
   ]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Personnel"}]},
   {"type":"bulletList","content":[
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Celebrant / Officiant: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cantor: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Accompanist / Organist: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Choir: {{ensemble_name}}"}]}]}
   ]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Rehearsal notes"}]},
   {"type":"paragraph"},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Follow-ups"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Confirm music with celebrant"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Print worship aid / order of service"}]}]}
   ]}
 ]}'::jsonb,
 E'## Liturgy — {{date}}\n\nFeast / Sunday: \n\nSeason:     Liturgical color: \n\n### Music\n\n- Prelude: \n- Entrance / Processional: \n- Kyrie: \n- Gloria: \n- Responsorial Psalm: \n- Gospel Acclamation: \n- Offertory / Anthem: \n- Sanctus: \n- Memorial Acclamation / Great Amen: \n- Agnus Dei: \n- Communion: \n- Recessional / Postlude: \n\n### Readings\n\n- First reading: \n- Psalm: \n- Second reading: \n- Gospel: \n\n### Personnel\n\n- Celebrant / Officiant: \n- Cantor: \n- Accompanist / Organist: \n- Choir: {{ensemble_name}}\n\n### Rehearsal notes\n\n### Follow-ups\n\n- [ ] Confirm music with celebrant\n- [ ] Print worship aid / order of service\n'),
(NULL, NULL, true, 'Concert program plan', 'Program order with timings, notes and texts, and a program-to-print checklist.', 'note',
 '{"type":"doc","content":[
   {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"{{concert_title}} — {{concert_date}}"}]},
   {"type":"paragraph","content":[{"type":"text","text":"Ensemble: {{ensemble_name}}    Venue: "}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Program order"}]},
   {"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic"}],"text":"Title — Composer / arr. (duration)"}]},
   {"type":"orderedList","content":[
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]}
   ]},
   {"type":"paragraph","content":[{"type":"text","text":"— Intermission —"}]},
   {"type":"orderedList","content":[
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]},
     {"type":"listItem","content":[{"type":"paragraph"}]}
   ]},
   {"type":"paragraph","content":[{"type":"text","text":"Running time (with remarks): "}]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Program notes & texts"}]},
   {"type":"bulletList","content":[
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Program notes drafted for: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Texts / translations needed for: "}]}]},
     {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Soloists / personnel to credit: "}]}]}
   ]},
   {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Checklist"}]},
   {"type":"taskList","content":[
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Finalize program order"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Verify composer / arranger credits and licensing"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Draft program in Concert Planner"}]}]},
     {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Send program to print"}]}]}
   ]}
 ]}'::jsonb,
 E'## {{concert_title}} — {{concert_date}}\n\nEnsemble: {{ensemble_name}}    Venue: \n\n### Program order\n\n*Title — Composer / arr. (duration)*\n\n1. \n2. \n3. \n4. \n5. \n\n— Intermission —\n\n1. \n2. \n3. \n\nRunning time (with remarks): \n\n### Program notes & texts\n\n- Program notes drafted for: \n- Texts / translations needed for: \n- Soloists / personnel to credit: \n\n### Checklist\n\n- [ ] Finalize program order\n- [ ] Verify composer / arranger credits and licensing\n- [ ] Draft program in Concert Planner\n- [ ] Send program to print\n')
ON CONFLICT DO NOTHING;
