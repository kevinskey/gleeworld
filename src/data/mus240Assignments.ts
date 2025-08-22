// src/data/mus240Assignments.ts
export type Assignment = {
  id: string;
  title: string;
  type: 'listening_journal' | 'reflection_paper' | 'research_project' | 'exam' | 'final_reflection';
  points: number;
  description: string;
  dueDate: string;
  instructions?: string;
};

export type WeekAssignments = {
  number: number;
  date: string;
  title: string;
  assignments: Assignment[];
};

export const ASSIGNMENTS: WeekAssignments[] = [
  {
    number: 1,
    date: "2025-08-27",
    title: "West African Foundations: Rhythm, Call-and-Response, Timeline Patterns",
    assignments: [
      {
        id: "lj1",
        title: "Listening Journal #1",
        type: "listening_journal",
        points: 20,
        description: "Write a 250–300 word entry on assigned West African works, identifying genre, style traits, and cultural significance.",
        dueDate: "2025-09-01",
        instructions: "Focus on rhythm patterns, call-and-response structures, and timeline patterns in traditional Ewe music."
      }
    ]
  },
  {
    number: 2,
    date: "2025-09-03",
    title: "Spirituals and Early Blues: From Field Hollers to Form",
    assignments: [
      {
        id: "lj2",
        title: "Listening Journal #2",
        type: "listening_journal",
        points: 20,
        description: "Analyze spirituals and early blues, connecting musical features with historical and cultural contexts.",
        dueDate: "2025-09-08",
        instructions: "Compare field hollers with structured spirituals, noting evolution of form and function."
      }
    ]
  },
  {
    number: 3,
    date: "2025-09-10",
    title: "Ragtime and Piano Traditions",
    assignments: [
      {
        id: "lj3",
        title: "Listening Journal #3",
        type: "listening_journal",
        points: 20,
        description: "Examine ragtime's syncopated rhythms and its impact on American popular music.",
        dueDate: "2025-09-15",
        instructions: "Focus on Scott Joplin's compositional techniques and ragtime's social context."
      }
    ]
  },
  {
    number: 4,
    date: "2025-09-17",
    title: "Harlem Renaissance and Early Jazz",
    assignments: [
      {
        id: "lj4",
        title: "Listening Journal #4",
        type: "listening_journal",
        points: 20,
        description: "Analyze early jazz innovations and Harlem Renaissance cultural connections.",
        dueDate: "2025-09-22",
        instructions: "Connect musical innovations to broader cultural movements of the 1920s."
      },
      {
        id: "rp1",
        title: "Reflection Paper #1",
        type: "reflection_paper",
        points: 50,
        description: "Write a 2–3 page essay on the emergence of jazz within African American communities.",
        dueDate: "2025-09-24",
        instructions: "Present a clear thesis with evidence from assigned readings and listening examples."
      }
    ]
  },
  {
    number: 5,
    date: "2025-09-24",
    title: "Swing Era: Big Bands and Popular Culture",
    assignments: [
      {
        id: "lj5",
        title: "Listening Journal #5",
        type: "listening_journal",
        points: 20,
        description: "Examine swing era big band arrangements and their cultural impact.",
        dueDate: "2025-09-29",
        instructions: "Focus on orchestration techniques and swing's role in American popular culture."
      }
    ]
  },
  {
    number: 6,
    date: "2025-10-01",
    title: "Gospel Golden Age and WWII Era",
    assignments: [
      {
        id: "research_proposal",
        title: "Research Project Proposal",
        type: "research_project",
        points: 20,
        description: "Submit one-paragraph topic description for final research project.",
        dueDate: "2025-10-03",
        instructions: "Choose a topic within African American music scope with clear research potential."
      },
      {
        id: "lj6",
        title: "Listening Journal #6",
        type: "listening_journal",
        points: 20,
        description: "Analyze gospel music's development and its influence on later popular music.",
        dueDate: "2025-10-06",
        instructions: "Connect gospel innovations to blues, soul, and R&B developments."
      }
    ]
  },
  {
    number: 7,
    date: "2025-10-08",
    title: "Freedom Songs and the Civil Rights Era",
    assignments: [
      {
        id: "lj7",
        title: "Listening Journal #7",
        type: "listening_journal",
        points: 20,
        description: "Examine freedom songs and their role in the Civil Rights Movement.",
        dueDate: "2025-10-13",
        instructions: "Analyze how music functioned as protest and community building."
      }
    ]
  },
  {
    number: 8,
    date: "2025-10-15",
    title: "Motown, Stax, and Soul Aesthetics",
    assignments: [
      {
        id: "midterm",
        title: "Midterm Exam",
        type: "exam",
        points: 100,
        description: "Listening identification and short essays covering Weeks 1–8 material.",
        dueDate: "2025-10-17",
        instructions: "Part 1: Listening ID. Part 2: Essays on genres, performers, and cultural significance."
      },
      {
        id: "rp2",
        title: "Reflection Paper #2",
        type: "reflection_paper",
        points: 50,
        description: "Analyze soul music's aesthetic and its relationship to Civil Rights era consciousness.",
        dueDate: "2025-10-20",
        instructions: "Compare Motown and Stax approaches to soul music production and marketing."
      }
    ]
  },
  {
    number: 9,
    date: "2025-10-22",
    title: "Funk Innovations and the 1970s",
    assignments: [
      {
        id: "lj8",
        title: "Listening Journal #8",
        type: "listening_journal",
        points: 20,
        description: "Examine funk's rhythmic innovations and cultural significance.",
        dueDate: "2025-10-27",
        instructions: "Focus on James Brown's contributions and funk's influence on hip-hop."
      }
    ]
  },
  {
    number: 10,
    date: "2025-10-29",
    title: "Soul, Black Power, and Crossover Markets",
    assignments: [
      {
        id: "annotated_bibliography",
        title: "Annotated Bibliography",
        type: "research_project",
        points: 30,
        description: "Submit at least 5 credible sources with annotations for research project.",
        dueDate: "2025-10-31",
        instructions: "Include academic sources with 100-150 word annotations explaining relevance."
      },
      {
        id: "lj9",
        title: "Listening Journal #9",
        type: "listening_journal",
        points: 20,
        description: "Analyze crossover success and Black Power era musical expression.",
        dueDate: "2025-11-03",
        instructions: "Examine tensions between commercial success and cultural authenticity."
      }
    ]
  },
  {
    number: 11,
    date: "2025-11-05",
    title: "Hip-Hop Origins: Bronx to Broadcast",
    assignments: [
      {
        id: "lj10",
        title: "Listening Journal #10",
        type: "listening_journal",
        points: 20,
        description: "Examine hip-hop's foundational elements and early innovations.",
        dueDate: "2025-11-10",
        instructions: "Focus on DJ techniques, breakbeats, and early rap lyricism."
      }
    ]
  },
  {
    number: 12,
    date: "2025-11-12",
    title: "Hip-Hop Golden Age: Innovation and Lyricism",
    assignments: [
      {
        id: "rp3",
        title: "Reflection Paper #3",
        type: "reflection_paper",
        points: 50,
        description: "Analyze hip-hop's evolution from underground culture to mainstream phenomenon.",
        dueDate: "2025-11-17",
        instructions: "Examine lyrical content, production techniques, and cultural impact."
      }
    ]
  },
  {
    number: 13,
    date: "2025-11-19",
    title: "Contemporary I: R&B, Neo-Soul, Digital Production",
    assignments: [
      {
        id: "draft_presentations",
        title: "Draft Research Presentations",
        type: "research_project",
        points: 0,
        description: "Practice presentations in preparation for final week.",
        dueDate: "2025-11-21",
        instructions: "Prepare 10-minute presentation of research findings."
      }
    ]
  },
  {
    number: 14,
    date: "2025-11-26",
    title: "Contemporary II: Global Streams and Sacred Crossings",
    assignments: []
  },
  {
    number: 15,
    date: "2025-12-03",
    title: "Student Research Presentations & Synthesis",
    assignments: [
      {
        id: "final_presentation",
        title: "Final Research Presentation",
        type: "research_project",
        points: 100,
        description: "Digital project presentation (video, website, podcast, or interactive format).",
        dueDate: "2025-12-03",
        instructions: "Present findings in professional online format with creative elements."
      }
    ]
  },
  {
    number: 16,
    date: "2025-12-10",
    title: "Final Reflection and Course Conclusion",
    assignments: [
      {
        id: "final_reflection",
        title: "Final Reflection Essay",
        type: "final_reflection",
        points: 50,
        description: "4–5 page essay reflecting on course themes and personal insights.",
        dueDate: "2025-12-12",
        instructions: "Draw on examples from at least three styles studied, connect to personal perspective."
      }
    ]
  }
];

export default ASSIGNMENTS;