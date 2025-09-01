export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  type: 'listening-journal' | 'essay' | 'quiz' | 'project';
  estimatedTime?: string;
  points?: number;
}

export interface WeekAssignments {
  week: number;
  topic: string;
  startDate: string;
  endDate: string;
  assignments: Assignment[];
}

export const mus240Assignments: WeekAssignments[] = [
  {
    week: 1,
    topic: "Introduction to African American Musical Traditions",
    startDate: "2025-08-20",
    endDate: "2025-08-26",
    assignments: [
      {
        id: "lj1",
        title: "Listening Journal 1: African Roots",
        description: "Listen to the assigned African traditional music examples and reflect on their influence on African American music.",
        instructions: "Focus on rhythmic patterns, call-and-response structures, and vocal techniques. How do these elements appear in later African American musical forms?",
        dueDate: "2025-08-31",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 2,
    topic: "Spirituals and Vocal Traditions",
    startDate: "2025-08-27",
    endDate: "2025-09-02",
    assignments: [
      {
        id: "lj2",
        title: "Week 2 Listening Guide – Spirituals and Vocal Traditions",
        description: "Listening Selections: Fisk Jubilee Singers – \"Swing Low, Sweet Chariot\", Field Holler (archival example), Robert Johnson – \"Cross Road Blues\", Kevin Phillip Johnson's arrangement of \"Children, Go Where I Send Thee\"",
        instructions: "Reflection Prompt (250–300 words)\nRespond to the week's listening by addressing:\n• Which African musical elements are present? (e.g., call-and-response, improvisation, polyrhythm, timbre).\n• How did these forms aid enslaved Africans—practically, spiritually, emotionally?\n• How do we see connections to blues development, especially in Robert Johnson's \"Cross Road Blues\"?\n• Choose one recording that stood out. Describe what you hear, what it communicates, and its cultural significance.\n\nPeer Comment Guidelines\nAfter submitting your journal:\n• Comment on at least two peers, 3–4 sentences each.\n• Acknowledge a specific point they made.\n• Expand the discussion with another insight, example, or question.\n• Connect their ideas back to the listening or course themes.\n• Avoid generic praise. Comments should deepen conversation.",
        dueDate: "2025-09-05",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 3,
    topic: "Blues: Foundation of American Popular Music",
    startDate: "2025-09-03",
    endDate: "2025-09-09",
    assignments: [
      {
        id: "lj3",
        title: "Listening Journal 3: Delta Blues",
        description: "Compare rural Delta blues with urban Chicago blues styles.",
        instructions: "Focus on instrumental techniques, vocal styles, and lyrical themes. How did the migration north change the blues?",
        dueDate: "2025-09-12",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 4,
    topic: "Jazz Origins and Early Development",
    startDate: "2025-09-10",
    endDate: "2025-09-16",
    assignments: [
      {
        id: "lj4",
        title: "Listening Journal 4: Jazz Origins",
        description: "Examine the emergence of jazz in New Orleans and its early development.",
        instructions: "Listen to early jazz recordings and analyze the fusion of ragtime, blues, and band music.",
        dueDate: "2025-09-19",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 5,
    topic: "Gospel Music and the Great Migration",
    startDate: "2025-09-17",
    endDate: "2025-09-23",
    assignments: [
      {
        id: "lj5",
        title: "Listening Journal 5: Gospel Traditions",
        description: "Study the development of gospel music and its relationship to spirituals.",
        instructions: "Compare traditional and contemporary gospel styles, noting influences from blues and jazz.",
        dueDate: "2025-09-26",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 6,
    topic: "R&B and Soul Music",
    startDate: "2025-09-24",
    endDate: "2025-09-30",
    assignments: [
      {
        id: "lj6",
        title: "Listening Journal 6: R&B Evolution",
        description: "Trace the evolution from rhythm and blues to soul music.",
        instructions: "Analyze vocal techniques, instrumentation, and lyrical themes in R&B and soul.",
        dueDate: "2025-10-03",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 7,
    topic: "Motown and the Sound of Young America",
    startDate: "2025-10-01",
    endDate: "2025-10-07",
    assignments: [
      {
        id: "lj7",
        title: "Listening Journal 7: Motown Sound",
        description: "Examine the Motown production style and its cultural impact.",
        instructions: "Listen to key Motown recordings and analyze the 'Motown Sound' formula.",
        dueDate: "2025-10-10",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 8,
    topic: "Funk and the Rhythmic Revolution",
    startDate: "2025-10-08",
    endDate: "2025-10-14",
    assignments: [
      {
        id: "midterm",
        title: "Midterm Essay: African American Music Heritage",
        description: "Write a comprehensive essay analyzing the development of African American music from spirituals to funk.",
        instructions: "Connect musical elements across genres and discuss cultural and social influences.",
        dueDate: "2025-10-17",
        type: "essay",
        estimatedTime: "3 hours",
        points: 50
      }
    ]
  },
  {
    week: 9,
    topic: "Hip-Hop Culture and Rap Music",
    startDate: "2025-10-15",
    endDate: "2025-10-21",
    assignments: [
      {
        id: "lj8",
        title: "Listening Journal 8: Hip-Hop Foundations",
        description: "Analyze the emergence of hip-hop culture and early rap music.",
        instructions: "Examine sampling techniques, lyrical content, and the four elements of hip-hop culture.",
        dueDate: "2025-10-24",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 10,
    topic: "Contemporary R&B and Neo-Soul",
    startDate: "2025-10-22",
    endDate: "2025-10-28",
    assignments: [
      {
        id: "lj9",
        title: "Listening Journal 9: Contemporary R&B Evolution",
        description: "Study the evolution of R&B from the 1990s to present day.",
        instructions: "Compare traditional R&B with contemporary styles, noting technological and cultural influences.",
        dueDate: "2025-10-31",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 11,
    topic: "Gospel's Modern Evolution",
    startDate: "2025-10-29",
    endDate: "2025-11-04",
    assignments: [
      {
        id: "lj10",
        title: "Listening Journal 10: Contemporary Gospel",
        description: "Examine modern gospel music and its fusion with other genres.",
        instructions: "Analyze how contemporary gospel incorporates elements from R&B, hip-hop, and pop music.",
        dueDate: "2025-11-07",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 12,
    topic: "Jazz Fusion and Modern Jazz",
    startDate: "2025-11-05",
    endDate: "2025-11-11",
    assignments: [
      {
        id: "lj11",
        title: "Listening Journal 11: Jazz Evolution",
        description: "Trace jazz development from bebop through fusion to contemporary jazz.",
        instructions: "Compare different jazz eras and analyze the incorporation of electronic elements.",
        dueDate: "2025-11-14",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 13,
    topic: "African American Music in Popular Culture",
    startDate: "2025-11-12",
    endDate: "2025-11-18",
    assignments: [
      {
        id: "lj12",
        title: "Listening Journal 12: Global Influence",
        description: "Examine the global influence of African American music on world music.",
        instructions: "Analyze how African American musical styles have influenced international artists and genres.",
        dueDate: "2025-11-21",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 14,
    topic: "Music and Social Justice",
    startDate: "2025-11-19",
    endDate: "2025-11-25",
    assignments: [
      {
        id: "lj13",
        title: "Listening Journal 13: Protest and Resistance",
        description: "Study the role of African American music in social movements.",
        instructions: "Analyze protest songs from different eras and their impact on social change.",
        dueDate: "2025-12-05",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 15,
    topic: "Future Directions and Legacy",
    startDate: "2025-12-03",
    endDate: "2025-12-09",
    assignments: [
      {
        id: "final-project",
        title: "Final Research Project: Musical Legacy Analysis",
        description: "Create a comprehensive research project analyzing the legacy and future of African American music.",
        instructions: "Choose a specific artist, genre, or movement and trace its historical significance and contemporary relevance. Include multimedia presentation.",
        dueDate: "2025-12-12",
        type: "project",
        estimatedTime: "4 hours",
        points: 75
      }
    ]
  },
  {
    week: 16,
    topic: "Final Presentations and Course Reflection",
    startDate: "2025-12-10",
    endDate: "2025-12-16",
    assignments: [
      {
        id: "final-reflection",
        title: "Course Reflection Essay",
        description: "Write a reflective essay on your learning journey through African American music history.",
        instructions: "Reflect on how the course has changed your understanding of music, culture, and history. Connect course themes to contemporary issues.",
        dueDate: "2025-12-16",
        type: "essay",
        estimatedTime: "2 hours",
        points: 25
      }
    ]
  }
];

// Export aliases for backward compatibility
export const ASSIGNMENTS = mus240Assignments;
export const WEEK_ASSIGNMENTS = mus240Assignments;