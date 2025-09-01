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
    startDate: "2025-08-19",
    endDate: "2025-08-25",
    assignments: [
      {
        id: "lj1",
        title: "Listening Journal 1: African Roots",
        description: "Listen to the assigned African traditional music examples and reflect on their influence on African American music.",
        instructions: "Focus on rhythmic patterns, call-and-response structures, and vocal techniques. How do these elements appear in later African American musical forms?",
        dueDate: "2025-08-23",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 10
      }
    ]
  },
  {
    week: 2,
    topic: "Spirituals and Work Songs",
    startDate: "2025-08-26",
    endDate: "2025-09-01",
    assignments: [
      {
        id: "lj2",
        title: "Listening Journal 2: Spirituals Analysis",
        description: "Analyze the spiritual 'Go Down Moses' and its historical context.",
        instructions: "Examine the dual meaning of spirituals as both religious expression and coded messages for the Underground Railroad.",
        dueDate: "2025-08-30",
        type: "listening-journal",
        estimatedTime: "30 minutes",
        points: 10
      }
    ]
  },
  {
    week: 3,
    topic: "Blues: Foundation of American Popular Music",
    startDate: "2025-09-02",
    endDate: "2025-09-08",
    assignments: [
      {
        id: "lj3",
        title: "Listening Journal 3: Delta Blues",
        description: "Compare rural Delta blues with urban Chicago blues styles.",
        instructions: "Focus on instrumental techniques, vocal styles, and lyrical themes. How did the migration north change the blues?",
        dueDate: "2025-09-06",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 10
      }
    ]
  },
  {
    week: 4,
    topic: "Jazz Origins and Early Development",
    startDate: "2025-09-09",
    endDate: "2025-09-15",
    assignments: [
      {
        id: "lj4",
        title: "Listening Journal 4: Jazz Origins",
        description: "Examine the emergence of jazz in New Orleans and its early development.",
        instructions: "Listen to early jazz recordings and analyze the fusion of ragtime, blues, and band music.",
        dueDate: "2025-09-13",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 10
      }
    ]
  },
  {
    week: 5,
    topic: "Gospel Music and the Great Migration",
    startDate: "2025-09-16",
    endDate: "2025-09-22",
    assignments: [
      {
        id: "lj5",
        title: "Listening Journal 5: Gospel Traditions",
        description: "Study the development of gospel music and its relationship to spirituals.",
        instructions: "Compare traditional and contemporary gospel styles, noting influences from blues and jazz.",
        dueDate: "2025-09-20",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 10
      }
    ]
  },
  {
    week: 6,
    topic: "R&B and Soul Music",
    startDate: "2025-09-23",
    endDate: "2025-09-29",
    assignments: [
      {
        id: "lj6",
        title: "Listening Journal 6: R&B Evolution",
        description: "Trace the evolution from rhythm and blues to soul music.",
        instructions: "Analyze vocal techniques, instrumentation, and lyrical themes in R&B and soul.",
        dueDate: "2025-09-27",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 10
      }
    ]
  },
  {
    week: 7,
    topic: "Motown and the Sound of Young America",
    startDate: "2025-09-30",
    endDate: "2025-10-06",
    assignments: [
      {
        id: "lj7",
        title: "Listening Journal 7: Motown Sound",
        description: "Examine the Motown production style and its cultural impact.",
        instructions: "Listen to key Motown recordings and analyze the 'Motown Sound' formula.",
        dueDate: "2025-10-04",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 10
      }
    ]
  },
  {
    week: 8,
    topic: "Funk and the Rhythmic Revolution",
    startDate: "2025-10-07",
    endDate: "2025-10-13",
    assignments: [
      {
        id: "midterm",
        title: "Midterm Essay: African American Music Heritage",
        description: "Write a comprehensive essay analyzing the development of African American music from spirituals to funk.",
        instructions: "Connect musical elements across genres and discuss cultural and social influences.",
        dueDate: "2025-10-11",
        type: "essay",
        estimatedTime: "3 hours",
        points: 50
      }
    ]
  }
];

// Export aliases for backward compatibility
export const ASSIGNMENTS = mus240Assignments;
export const WEEK_ASSIGNMENTS = mus240Assignments;