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
    startDate: "2024-08-19",
    endDate: "2024-08-25",
    assignments: [
      {
        id: "lj1",
        title: "Listening Journal 1: West African Foundations",
        description: "Listen to the assigned African traditional music examples and reflect on their influence on African American music.",
        instructions: "Focus on rhythmic patterns, call-and-response structures, and vocal techniques. How do these elements appear in later African American musical forms?",
        dueDate: "2024-08-23",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 10
      }
    ]
  }
];

// Export aliases for backward compatibility
export const ASSIGNMENTS = mus240Assignments;
export const WEEK_ASSIGNMENTS = mus240Assignments;