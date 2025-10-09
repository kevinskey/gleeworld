// MUS 240 Assignment Schedule - Updated for Fall 2025
// Class meets MWF, weeks run Monday-Friday
export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  type: 'listening-journal' | 'essay' | 'quiz' | 'project' | 'exam' | 'reflection-paper' | 'research-proposal' | 'annotated-bibliography';
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
    startDate: "2025-08-25",
    endDate: "2025-08-29",
    assignments: [
      {
        id: "lj1",
        title: "Listening Journal 1: African Roots",
        description: "Listen to the assigned African traditional music examples and reflect on their influence on African American music. **No late penalty for this first assignment - students are still getting familiar with the format.**",
        instructions: "Focus on rhythmic patterns, call-and-response structures, and vocal techniques. How do these elements appear in later African American musical forms? This is your first journal assignment, so take time to understand the format and expectations. Late submissions will be accepted without penalty to help you adjust to the course requirements.",
        dueDate: "2025-09-03",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 2,
    topic: "Spirituals and Vocal Traditions",
    startDate: "2025-09-01",
    endDate: "2025-09-05",
    assignments: [
      {
        id: "lj2",
        title: "Week 2 Listening Guide – Spirituals and Vocal Traditions",
        description: "Listening Selections: Fisk Jubilee Singers – \"Swing Low, Sweet Chariot\", Field Holler (archival example), Robert Johnson – \"Cross Road Blues\", Kevin Phillip Johnson's arrangement of \"Children, Go Where I Send Thee\"",
        instructions: "Reflection Prompt (250–300 words)\nRespond to the week's listening by addressing:\n• Which African musical elements are present? (e.g., call-and-response, improvisation, polyrhythm, timbre).\n• How did these forms aid enslaved Africans—practically, spiritually, emotionally?\n• How do we see connections to blues development, especially in Robert Johnson's \"Cross Road Blues\"?\n• Choose one recording that stood out. Describe what you hear, what it communicates, and its cultural significance.\n\nPeer Comment Guidelines\nAfter submitting your journal:\n• Comment on at least two peers, 3–4 sentences each.\n• Acknowledge a specific point they made.\n• Expand the discussion with another insight, example, or question.\n• Connect their ideas back to the listening or course themes.\n• Avoid generic praise. Comments should deepen conversation.",
        dueDate: "2025-09-10",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 3,
    topic: "Blues: Foundation of American Popular Music",
    startDate: "2025-09-08",
    endDate: "2025-09-12",
    assignments: [
      {
        id: "lj3",
        title: "Listening Journal 3: Delta Blues",
        description: "Compare rural Delta blues with urban Chicago blues styles.",
        instructions: "Focus on instrumental techniques, vocal styles, and lyrical themes. How did the migration north change the blues?",
        dueDate: "2025-09-17",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      },
      {
        id: "rp1",
        title: "Reflection Paper 1: Cultural Context in Blues",
        description: "Demonstrate critical thinking about blues music in its cultural context.",
        instructions: "Write a 2-3 page essay presenting a clear thesis about how blues music reflected the cultural and social conditions of African Americans. Use evidence from assigned readings or listening examples and connect to historical/cultural issues. Format: MLA or Chicago style, double-spaced.",
        dueDate: "2025-09-19",
        type: "reflection-paper",
        estimatedTime: "3 hours",
        points: 50
      }
    ]
  },
  {
    week: 4,
    topic: "Ragtime",
    startDate: "2025-09-15",
    endDate: "2025-09-19",
    assignments: [
      {
        id: "lj4",
        title: "Listening Journal 4: Ragtime",
        description: "Examine Scott Joplin and the evolution of ragtime piano music.",
        instructions: "Listen to ragtime recordings and analyze syncopation as sophistication. Focus on early Black composers and the evolution of musical notation.",
        dueDate: "2025-09-24",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 5,
    topic: "Jazz Origins and Early Development",
    startDate: "2025-09-22",
    endDate: "2025-09-26",
    assignments: [
      {
        id: "lj5",
        title: "Listening Journal 5: Jazz Origins",
        description: "Examine the emergence of jazz from New Orleans to Harlem.",
        instructions: "Listen to early jazz recordings and analyze the emergence of improvisation, swing, and ensemble conversation. Focus on how ragtime, blues, and band music fused into jazz.",
        dueDate: "2025-10-01",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 6,
    topic: "Jubilee Quartets",
    startDate: "2025-09-29",
    endDate: "2025-10-03",
    assignments: [
      {
        id: "lj6",
        title: "Listening Journal 6: Jubilee Quartets",
        description: "Study jubilee quartets from Fisk to the Golden Gate Quartet.",
        instructions: "Analyze vocal harmony as community statement and spiritual expression. Focus on the evolution from spirituals to arranged quartet singing.",
        dueDate: "2025-10-08",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      },
      {
        id: "research-proposal",
        title: "Group Project Proposal: AI and Music",
        description: "One-paragraph topic description for your group project exploring AI's impact on African American music.",
        instructions: "Submit a one-paragraph description of your group's chosen focus within the AI and Music theme. Your topic should examine how artificial intelligence is affecting African American music creation, production, distribution, or consumption. Include your group members' names and be specific about your research question and why this aspect is significant. Consider topics like AI-generated music, algorithmic curation, AI in music production tools, or ethical considerations.",
        dueDate: "2025-10-06",
        type: "research-proposal",
        estimatedTime: "1 hour",
        points: 20
      }
    ]
  },
  {
    week: 7,
    topic: "1939–1969: From Spirituals to Swing to King",
    startDate: "2025-10-06",
    endDate: "2025-10-10",
    assignments: [
      {
        id: "lj7",
        title: "Listening Journal 7: Spirituals to Swing to King",
        description: "Examine the evolution from sacred song to social anthem.",
        instructions: "Listen to recordings from Carnegie Hall's 'Spirituals to Swing,' Civil Rights music, and the Harlem Cultural Festival. Analyze how music evolved from spiritual expression to protest anthem.",
        dueDate: "2025-10-15",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      },
      {
        id: "rp2",
        title: "Reflection Paper 2: Music and the Civil Rights Movement",
        description: "Analyze music's role in the Civil Rights Movement from 1939-1969.",
        instructions: "Write a 2-3 page essay examining how music evolved from sacred spirituals to protest anthems during this transformative period. Present a clear thesis with evidence from course materials connecting musical developments to social movements. Format: MLA or Chicago style, double-spaced.",
        dueDate: "2025-10-13",
        type: "reflection-paper",
        estimatedTime: "3 hours",
        points: 50
      }
    ]
  },
  {
    week: 8,
    topic: "1970s: James Brown, Funk, Disco, and Detroit Techno",
    startDate: "2025-10-13",
    endDate: "2025-10-17",
    assignments: [
      {
        id: "midterm-exam",
        title: "Midterm Exam",
        description: "Assess understanding of music styles, genres, and cultural contexts (Weeks 1–8).",
        instructions: "Part 1: Listening Identification - Identify musical examples and key characteristics. Part 2: Short Essays on genres, performers, and cultural significance. Completed in class during mid-semester examination period (Oct 3). Focus on identification accuracy, strength of explanations, proper terminology, and historical/cultural integration.",
        dueDate: "2025-10-03",
        type: "exam",
        estimatedTime: "2 hours",
        points: 100
      }
    ]
  },
  {
    week: 9,
    topic: "Hip-Hop Culture and Rap Music",
    startDate: "2025-10-20",
    endDate: "2025-10-24",
    assignments: [
      {
        id: "lj8",
        title: "Listening Journal 8: Hip-Hop Foundations",
        description: "Analyze the emergence of hip-hop culture and early rap music.",
        instructions: "Examine sampling techniques, lyrical content, and the four elements of hip-hop culture.",
        dueDate: "2025-10-29",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 10,
    topic: "Contemporary R&B and Neo-Soul",
    startDate: "2025-10-27",
    endDate: "2025-10-31",
    assignments: [
      {
        id: "lj9",
        title: "Listening Journal 9: Contemporary R&B Evolution",
        description: "Study the evolution of R&B from the 1990s to present day.",
        instructions: "Compare traditional R&B with contemporary styles, noting technological and cultural influences.",
        dueDate: "2025-11-05",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      },
      {
        id: "annotated-bibliography",
        title: "Group Project Annotated Bibliography: AI and Music",
        description: "Compile and annotate at least 5 credible sources for your group project on AI and music.",
        instructions: "Create an annotated bibliography with at least 5 credible sources (scholarly articles, books, interviews with AI music researchers, industry reports, etc.) related to AI's impact on African American music. Each annotation should be 2-3 sentences summarizing the source and explaining its relevance to your group project. Include diverse perspectives on AI in music production, creation, ethics, and cultural impact. Format: MLA or Chicago style.",
        dueDate: "2025-11-03",
        type: "annotated-bibliography",
        estimatedTime: "4 hours",
        points: 30
      }
    ]
  },
  {
    week: 11,
    topic: "Gospel's Modern Evolution",
    startDate: "2025-11-03",
    endDate: "2025-11-07",
    assignments: [
      {
        id: "lj10",
        title: "Listening Journal 10: Contemporary Gospel",
        description: "Examine modern gospel music and its fusion with other genres.",
        instructions: "Analyze how contemporary gospel incorporates elements from R&B, hip-hop, and pop music.",
        dueDate: "2025-11-12",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 12,
    topic: "Jazz Fusion and Modern Jazz",
    startDate: "2025-11-10",
    endDate: "2025-11-14",
    assignments: [
      {
        id: "lj11",
        title: "Listening Journal 11: Jazz Evolution",
        description: "Trace jazz development from bebop through fusion to contemporary jazz.",
        instructions: "Compare different jazz eras and analyze the incorporation of electronic elements.",
        dueDate: "2025-11-19",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      },
      {
        id: "rp3",
        title: "Reflection Paper 3: Jazz and Social Change",
        description: "Examine jazz music's relationship to social and political movements.",
        instructions: "Write a 2-3 page essay analyzing how jazz music both reflected and influenced social change in America. Focus on specific examples and connect musical developments to broader cultural movements. Present a clear thesis with evidence from course materials. Format: MLA or Chicago style, double-spaced.",
        dueDate: "2025-11-17",
        type: "reflection-paper",
        estimatedTime: "3 hours",
        points: 50
      }
    ]
  },
  {
    week: 13,
    topic: "Hip-Hop II: Contemporary Directions",
    startDate: "2025-11-17",
    endDate: "2025-11-21",
    assignments: [
      {
        id: "lj12",
        title: "Listening Journal 12: Contemporary Hip-Hop",
        description: "Examine trap, drill, and conscious rap in contemporary hip-hop.",
        instructions: "Analyze contemporary hip-hop artists like Kendrick Lamar, J. Cole, and Megan Thee Stallion. Focus on global hip-hop identity and diverse sub-genres.",
        dueDate: "2025-11-26",
        type: "listening-journal",
        estimatedTime: "40 minutes",
        points: 20
      }
    ]
  },
  {
    week: 14,
    topic: "AI Workday",
    startDate: "2025-11-24",
    endDate: "2025-11-28",
    assignments: [
      {
        id: "lj13",
        title: "AI Workshop Reflection",
        description: "Workshop on AI-assisted music creation and exploration of authorship, ethics, and innovation.",
        instructions: "Participate in hands-on AI music creation workshop. Reflect on the tools explored, ethical considerations, and the future of AI in African American music.",
        dueDate: "2025-12-03",
        type: "listening-journal",
        estimatedTime: "45 minutes",
        points: 20
      }
    ]
  },
  {
    week: 15,
    topic: "Group AI Presentations",
    startDate: "2025-12-01",
    endDate: "2025-12-05",
    assignments: [
      {
        id: "final-research-project",
        title: "Group AI Presentations: From Spirituals to Swing to King to Code",
        description: "Present your group's research connecting African American music history to the digital present through AI.",
        instructions: "Create a digital group project (video, website, podcast, or interactive format) presenting 'From Spirituals to Swing to King to Code' - connecting historical African American musical traditions to contemporary AI technologies. Your presentation should demonstrate: content accuracy about AI technologies in music, depth of research on impact to African American musical traditions, integration of historical/cultural context, organization and clarity, creativity in presentation format, and effective group collaboration. Address both opportunities and challenges that AI presents for African American musicians and the broader musical community. Build upon your group's proposal and annotated bibliography.",
        dueDate: "2025-12-08",
        type: "project",
        estimatedTime: "6 hours",
        points: 100
      }
    ]
  },
  {
    week: 16,
    topic: "Final Exam & Reflection",
    startDate: "2025-12-08",
    endDate: "2025-12-12",
    assignments: [
      {
        id: "final-reflection-essay",
        title: "Final Exam & Reflection",
        description: "Comprehensive review and reflection on the enduring soul of African American music in a technological age.",
        instructions: "Write a 4–5-page essay reflecting on course themes, personal insights, and the role of music as cultural force in the digital age. Draw on examples from at least three styles studied in the course. Discuss how African American music continues to evolve in our technological present. Focus on integrating course themes, demonstrating depth of reflection, maintaining clarity, and effectively using examples from the semester. Format: MLA or Chicago style, double-spaced.",
        dueDate: "2025-12-14",
        type: "essay",
        estimatedTime: "4 hours",
        points: 50
      }
    ]
  }
];

// Export aliases for backward compatibility
export const ASSIGNMENTS = mus240Assignments;
export const WEEK_ASSIGNMENTS = mus240Assignments;