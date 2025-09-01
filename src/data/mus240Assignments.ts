
export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  type: 'listening-journal' | 'essay' | 'quiz' | 'project';
  estimatedTime?: string;
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
    startDate: "2024-08-19",
    endDate: "2024-08-25",
    assignments: [
      {
        id: "week1-journal1",
        title: "Listening Journal 1: African Roots",
        description: "Listen to the assigned African traditional music examples and reflect on their influence on African American music.",
        instructions: "Focus on rhythmic patterns, call-and-response structures, and vocal techniques. How do these elements appear in later African American musical forms?",
        dueDate: "2024-08-23",
        type: "listening-journal",
        estimatedTime: "45 minutes"
      }
    ]
  },
  {
    week: 2,
    topic: "Spirituals and Work Songs",
    startDate: "2024-08-26",
    endDate: "2024-09-01",
    assignments: [
      {
        id: "week2-journal1",
        title: "Listening Journal 2: Spirituals Analysis",
        description: "Analyze the spiritual 'Go Down Moses' and its historical context.",
        instructions: "Examine the dual meaning of spirituals as both religious expression and coded messages for the Underground Railroad.",
        dueDate: "2024-08-30",
        type: "listening-journal",
        estimatedTime: "30 minutes"
      }
    ]
  },
  {
    week: 3,
    topic: "Blues: Foundation of American Popular Music",
    startDate: "2024-09-02",
    endDate: "2024-09-08",
    assignments: [
      {
        id: "week3-journal1",
        title: "Listening Journal 3: Delta Blues",
        description: "Compare rural Delta blues with urban Chicago blues styles.",
        instructions: "Focus on instrumental techniques, vocal styles, and lyrical themes. How did the migration north change the blues?",
        dueDate: "2024-09-06",
        type: "listening-journal",
        estimatedTime: "40 minutes"
      }
    ]
  }
];
