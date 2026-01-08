import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Course data matching the academyCourses.ts configuration
const ACADEMY_COURSES = [
  {
    id: 'a0000000-0000-0000-0000-000000000070',
    courseCode: 'MUS 070',
    title: 'Glee Club',
    description: 'The premier choral ensemble of Spelman College with over 100 years of musical excellence.',
    level: 'Audition Required',
    duration: 'Semester',
    highlights: ['Choral Performance', 'Vocal Training', 'Tours & Concerts', 'Community'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 4
  },
  {
    id: 'a0000000-0000-0000-0000-000000000210',
    courseCode: 'MUS 210',
    title: 'Choral Conducting and Literature',
    description: 'Master the art of choral conducting with technique, score analysis, and repertoire selection.',
    level: 'Intermediate',
    duration: '16 Weeks',
    highlights: ['Conducting Technique', 'Score Analysis', 'Repertoire', 'Rehearsal Skills'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 3
  },
  {
    id: 'a0000000-0000-0000-0000-000000000240',
    courseCode: 'MUS 240',
    title: 'Survey of African American Music',
    description: 'Explore the rich tapestry of African American musical traditions, from spirituals and blues to jazz, gospel, R&B, and hip-hop.',
    level: 'All Levels',
    duration: '16 Weeks',
    highlights: ['Music History', 'Cultural Context', 'Listening Journals', 'Critical Analysis'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 2
  },
  {
    id: 'a0000000-0000-0000-0000-000000000101',
    courseCode: 'MUS 101',
    title: 'Music Fundamentals Theory',
    description: 'Build a strong foundation in music theory including notation, rhythm, scales, intervals, chords, and basic harmony.',
    level: 'Beginner',
    duration: '16 Weeks',
    highlights: ['Music Notation', 'Rhythm', 'Scales & Keys', 'Harmony Basics'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 1
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    courseCode: 'MUS 001',
    title: 'Private Applied Lessons',
    description: 'One-on-one instruction in voice or instrument with personalized curriculum tailored to your skill level and musical goals.',
    level: 'All Levels',
    duration: 'Ongoing',
    highlights: ['Individual Instruction', 'Personalized Curriculum', 'Performance Prep', 'Technique Development'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'By Appointment'
    },
    isActive: true,
    difficulty: 2
  },
  {
    id: 'a0000000-0000-0000-0000-000000000000',
    courseCode: 'MUS 000',
    title: 'Sight Singing Institute',
    description: 'Intensive training in sight-reading and ear training to develop musicianship skills essential for all musicians.',
    level: 'All Levels',
    duration: '8 Weeks',
    highlights: ['Sight Reading', 'Ear Training', 'Solfege', 'Musicianship'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 2
  },
  {
    id: 'a0000000-0000-0000-0000-0000000e0101',
    courseCode: 'GLEE 101',
    title: 'Leadership Development',
    description: 'Develop leadership skills essential for executive board members and future leaders in the Glee Club organization.',
    level: 'Advanced',
    duration: '16 Weeks',
    highlights: ['Leadership Skills', 'Team Management', 'Event Planning', 'Communication'],
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true,
    difficulty: 4
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Public Courses API called');

    // Parse query parameters for optional filtering
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('active') === 'true';
    const level = url.searchParams.get('level');
    const courseCode = url.searchParams.get('courseCode');

    let courses = [...ACADEMY_COURSES];

    // Apply filters
    if (activeOnly) {
      courses = courses.filter(c => c.isActive);
    }
    if (level) {
      courses = courses.filter(c => c.level.toLowerCase().includes(level.toLowerCase()));
    }
    if (courseCode) {
      courses = courses.filter(c => c.courseCode.toLowerCase() === courseCode.toLowerCase());
    }

    console.log(`Returning ${courses.length} courses`);

    return new Response(
      JSON.stringify({
        courses,
        total: courses.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in public-courses-api:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
