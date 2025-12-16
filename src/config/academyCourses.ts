// Unified Academy Course Configuration
import { Users, Music, BookOpen, Mic, Eye, Award, GraduationCap, LucideIcon } from 'lucide-react';

export interface AcademyCourse {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  icon: LucideIcon;
  level: string;
  duration: string;
  highlights: string[];
  route: string;
  instructor: {
    name: string;
    email: string;
    office: string;
    hours: string;
  };
  isActive: boolean;
}

export const ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000070',
    courseCode: 'MUS 070',
    title: 'Glee Club',
    description: 'The premier choral ensemble of Spelman College with over 100 years of musical excellence.',
    icon: Users,
    level: 'Audition Required',
    duration: 'Semester',
    highlights: ['Choral Performance', 'Vocal Training', 'Tours & Concerts', 'Community'],
    route: '/mus-070',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  },
  {
    id: 'mus-210',
    courseCode: 'MUS 210',
    title: 'Choral Conducting and Literature',
    description: 'Master the art of choral conducting with comprehensive training in technique, score analysis, and repertoire selection.',
    icon: Music,
    level: 'Intermediate',
    duration: '16 Weeks',
    highlights: ['Conducting Technique', 'Score Analysis', 'Repertoire', 'Rehearsal Skills'],
    route: '/mus-210',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  },
  {
    id: 'mus-240',
    courseCode: 'MUS 240',
    title: 'Survey of African American Music',
    description: 'Explore the rich tapestry of African American musical traditions, from spirituals and blues to jazz, gospel, R&B, and hip-hop.',
    icon: BookOpen,
    level: 'All Levels',
    duration: '16 Weeks',
    highlights: ['Music History', 'Cultural Context', 'Listening Journals', 'Critical Analysis'],
    route: '/mus-240',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  },
  {
    id: 'mus-101',
    courseCode: 'MUS 101',
    title: 'Music Fundamentals Theory',
    description: 'Build a strong foundation in music theory including notation, rhythm, scales, intervals, chords, and basic harmony.',
    icon: BookOpen,
    level: 'Beginner',
    duration: '16 Weeks',
    highlights: ['Music Notation', 'Rhythm', 'Scales & Keys', 'Harmony Basics'],
    route: '/mus-101',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  },
  {
    id: 'mus-001',
    courseCode: 'MUS 001',
    title: 'Private Applied Lessons',
    description: 'One-on-one instruction in voice or instrument with personalized curriculum tailored to your skill level and musical goals.',
    icon: Mic,
    level: 'All Levels',
    duration: 'Ongoing',
    highlights: ['Individual Instruction', 'Personalized Curriculum', 'Performance Prep', 'Technique Development'],
    route: '/mus-001',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'By Appointment'
    },
    isActive: true
  },
  {
    id: 'mus-000',
    courseCode: 'MUS 000',
    title: 'Sight Singing Institute',
    description: 'Intensive training in sight-reading and ear training to develop musicianship skills essential for all musicians.',
    icon: Eye,
    level: 'All Levels',
    duration: '8 Weeks',
    highlights: ['Sight Reading', 'Ear Training', 'Solfege', 'Musicianship'],
    route: '/mus-000',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  },
  {
    id: 'glee-101',
    courseCode: 'GLEE 101',
    title: 'Leadership Development',
    description: 'Develop leadership skills essential for executive board members and future leaders in the Glee Club organization.',
    icon: Award,
    level: 'Advanced',
    duration: '16 Weeks',
    highlights: ['Leadership Skills', 'Team Management', 'Event Planning', 'Communication'],
    route: '/glee-101',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM'
    },
    isActive: true
  }
];

export const getCourseByCode = (code: string): AcademyCourse | undefined => {
  return ACADEMY_COURSES.find(c => c.courseCode === code || c.id === code);
};

export const getCourseByRoute = (route: string): AcademyCourse | undefined => {
  return ACADEMY_COURSES.find(c => c.route === route);
};
