-- Fix duplicate display_order values in the Final Exam test
-- Question at display_order 16 (second one - gospel music) should be 16.5 → becomes 17
UPDATE test_questions SET display_order = 17 WHERE id = '237d2a78-467a-4047-84c9-e3db1894395a';

-- Shift all questions after to make room
UPDATE test_questions SET display_order = 18 WHERE id = 'd9bdbd3c-c0a8-4312-abc5-37d092d4c10a'; -- was 17
UPDATE test_questions SET display_order = 19 WHERE id = 'e84847ea-9c9c-4a7b-970a-1ec50baf4a1a'; -- was 18
UPDATE test_questions SET display_order = 20 WHERE id = '210b0122-63f0-4ed3-9fe8-92d8f8842ee6'; -- was 19
UPDATE test_questions SET display_order = 21 WHERE id = '9278619a-6468-4f8c-b066-1433686412c7'; -- was 20
UPDATE test_questions SET display_order = 22 WHERE id = '85a19259-e286-4027-b811-0f52d0d64bee'; -- was 21
UPDATE test_questions SET display_order = 23 WHERE id = 'ad3536d3-ba3b-4000-af77-91f6cb8c33e5'; -- was 22
UPDATE test_questions SET display_order = 24 WHERE id = '9f61a079-0756-45ad-9b19-4163abaa260f'; -- was 23
UPDATE test_questions SET display_order = 25 WHERE id = '21dc86ad-fc26-4463-a0a7-3541b009ccd8'; -- was 24
UPDATE test_questions SET display_order = 26 WHERE id = '8b6348b3-73a6-4244-b26d-3753ac7917fe'; -- was 25
UPDATE test_questions SET display_order = 27 WHERE id = '0fe24275-12fc-4c87-87e4-1f06e64004b2'; -- was 26
UPDATE test_questions SET display_order = 28 WHERE id = '133e111d-0b4e-4ed3-a232-16eb7a5d82bf'; -- was 27

-- Fix the three questions at display_order 28
UPDATE test_questions SET display_order = 29 WHERE id = '346a51df-b8ef-4082-8b08-cd1531df4bbd';
UPDATE test_questions SET display_order = 30 WHERE id = '2be61f44-8e56-4ad3-ad79-90c401860a1b';
UPDATE test_questions SET display_order = 31 WHERE id = '26480d4a-a758-494e-949c-8dabfba6e4d5';

-- Fix the two questions at display_order 29
UPDATE test_questions SET display_order = 32 WHERE id = '50ce8e40-a84e-4918-970b-84684f8ef485';
UPDATE test_questions SET display_order = 33 WHERE id = '3718dfcc-8a63-4c0c-9b24-6dc341dacfeb';