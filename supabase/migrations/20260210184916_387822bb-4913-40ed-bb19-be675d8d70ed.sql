-- Delete MUS 210 Choral Conducting sessions incorrectly on Tuesdays
DELETE FROM gw_events WHERE id IN (
  '7a7a6fcb-aaec-4b5a-8008-b35fcdf584ff',
  '4800834c-c21b-4ac1-84b7-bd106965981e',
  '9b72eff6-865a-4ea3-97b7-9f5d743da309',
  '530d1dd0-5758-47af-950c-6122860fda53',
  'a3faaf2f-79d1-4488-ae8e-c053c767e2dd'
);

-- Delete MUS 210 Choral Conducting sessions incorrectly on Thursdays
DELETE FROM gw_events WHERE id IN (
  '54e8ebe1-cdb4-4aa8-a671-11ba518db06b',
  '839e8300-d65e-4227-8440-18c2528734bc',
  'bd289a67-00e9-4b48-a464-1fc02f21e381',
  '7a3c5142-675d-4a27-8f50-17eab7c94a63',
  'd6c84a76-7a0f-447e-ab94-016ef5a40448',
  'ee312b53-4e02-4e37-a1fd-465a96be668d',
  '6f8443d0-aa10-4713-b59b-462801dbf7e1'
);