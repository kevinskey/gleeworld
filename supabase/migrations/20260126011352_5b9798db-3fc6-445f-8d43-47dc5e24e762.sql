INSERT INTO mus240_polls (title, description, questions, is_active, is_live_session, show_results, current_question_index, semester)
VALUES (
  'Module 2: Negro Folk Music and the Negro Spiritual',
  'A 10-question quiz exploring the origins, characteristics, and cultural significance of Negro folk music and spirituals.',
  '[
    {
      "question": "What is the primary origin of Negro spirituals?",
      "options": ["European classical music traditions", "African musical traditions blended with Christianity during slavery", "Native American ceremonial songs", "Caribbean island folk music"],
      "correct_answer": 1,
      "explanation": "Negro spirituals emerged from the blending of African musical traditions (call-and-response, polyrhythms) with Christian hymns during the American slavery period."
    },
    {
      "question": "Which musical technique, rooted in African traditions, is fundamental to Negro spirituals?",
      "options": ["Written notation", "Call-and-response", "Orchestral arrangement", "Solo performance only"],
      "correct_answer": 1,
      "explanation": "Call-and-response is a cornerstone of African musical traditions that was preserved and adapted in Negro spirituals, where a leader sings a phrase and the group responds."
    },
    {
      "question": "What dual purpose did many Negro spirituals serve during slavery?",
      "options": ["Entertainment and dance", "Religious expression and coded communication for escape", "Commercial profit and tourism", "Academic study and preservation"],
      "correct_answer": 1,
      "explanation": "Many spirituals contained hidden messages and codes that helped enslaved people communicate about escape routes on the Underground Railroad while appearing to be simply religious songs."
    },
    {
      "question": "Which group is credited with bringing Negro spirituals to wider American and international audiences in the late 1800s?",
      "options": ["The Boston Philharmonic", "The Fisk Jubilee Singers", "The New York Opera Company", "The Chicago Symphony Choir"],
      "correct_answer": 1,
      "explanation": "The Fisk Jubilee Singers, formed at Fisk University in 1871, toured extensively and introduced Negro spirituals to audiences across America and Europe, legitimizing them as an art form."
    },
    {
      "question": "What distinguishes Negro folk music from European folk traditions?",
      "options": ["Use of written scores", "Emphasis on individual virtuosity", "Complex rhythmic patterns and improvisation", "Strict adherence to musical rules"],
      "correct_answer": 2,
      "explanation": "Negro folk music is characterized by complex polyrhythms, syncopation, and improvisation, reflecting African musical heritage rather than the more structured European folk traditions."
    },
    {
      "question": "Which spiritual is known for its association with the Underground Railroad and uses geographic imagery?",
      "options": ["Amazing Grace", "Swing Low, Sweet Chariot", "Silent Night", "The Star-Spangled Banner"],
      "correct_answer": 1,
      "explanation": "Swing Low, Sweet Chariot is believed to have been used as a code song for the Underground Railroad, with the chariot symbolizing escape and home representing freedom in the North or Canada."
    },
    {
      "question": "What role did the ring shout play in Negro folk music traditions?",
      "options": ["It was a formal concert performance", "It was a communal worship practice combining singing, dancing, and clapping", "It was a solo singing competition", "It was a written composition technique"],
      "correct_answer": 1,
      "explanation": "The ring shout was a sacred African American worship practice where participants moved in a circle while singing, clapping, and stomping, blending African movement traditions with Christian worship."
    },
    {
      "question": "How did Negro spirituals influence later American music genres?",
      "options": ["They had no influence on later music", "They became the foundation for gospel, blues, and jazz", "They only influenced European classical music", "They were replaced entirely by new styles"],
      "correct_answer": 1,
      "explanation": "Negro spirituals laid the groundwork for gospel music, blues, jazz, and eventually rock and roll and R&B, making them foundational to virtually all American popular music."
    },
    {
      "question": "What emotional themes are commonly expressed in Negro spirituals?",
      "options": ["Wealth and prosperity", "Hope, sorrow, and the longing for freedom", "Political campaigns and elections", "Scientific discoveries"],
      "correct_answer": 1,
      "explanation": "Negro spirituals commonly express themes of hope for deliverance, sorrow over suffering, faith in God, and the deep longing for freedom from bondage."
    },
    {
      "question": "Why were Negro spirituals initially dismissed by some scholars and critics?",
      "options": ["They were too complex to understand", "They were seen as primitive folk music rather than legitimate art", "They were too similar to European opera", "They were only performed in churches"],
      "correct_answer": 1,
      "explanation": "Early scholars often dismissed Negro spirituals as simple slave songs rather than recognizing their artistic complexity, cultural significance, and profound influence on American music."
    }
  ]'::jsonb,
  false,
  false,
  false,
  0,
  'Fall 2025'
)