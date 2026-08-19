// Unified Academy Course Configuration - Ordered: GW 070, GW 240, GW 210, GW 001, GLEE 101, GLEE 000
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
    imageUrl?: string;
  };
  isActive: boolean;
}

export const ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000070',
    courseCode: 'GW 070',
    title: 'Glee Club',
    description: 'The premier choral ensemble of Riverside Music Institute with over 100 years of musical excellence.',
    icon: Users,
    level: 'Audition Required',
    duration: 'Semester',
    highlights: ['Choral Performance', 'Vocal Training', 'Tours & Concerts', 'Community'],
    route: '/academy/mus-070',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: true
  },
  {
    id: '2026c613-bda7-487a-a5d9-91e57c26a741',
    courseCode: 'GW 210',
    title: 'Choral Conducting and Literature',
    description: 'Master the art of choral conducting with technique, score analysis, and repertoire selection.',
    icon: Music,
    level: 'Intermediate',
    duration: '16 Weeks',
    highlights: ['Conducting Technique', 'Score Analysis', 'Repertoire', 'Rehearsal Skills'],
    route: '/academy/mus-210',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    courseCode: 'GW 001',
    title: 'Private Applied Lessons',
    description: 'One-on-one instruction in voice or instrument with personalized curriculum tailored to your skill level and musical goals.',
    icon: Mic,
    level: 'All Levels',
    duration: 'Ongoing',
    highlights: ['Individual Instruction', 'Personalized Curriculum', 'Performance Prep', 'Technique Development'],
    route: '/academy/mus-001',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'By Appointment',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: true
  },
  {
    id: 'a0000000-0000-0000-0000-0000000e0101',
    courseCode: 'GLEE 101',
    title: 'Leadership Development',
    description: 'Develop leadership skills essential for executive board members and future leaders in the Glee Club organization.',
    icon: Award,
    level: 'Advanced',
    duration: '16 Weeks',
    highlights: ['Leadership Skills', 'Team Management', 'Event Planning', 'Communication'],
    route: '/academy/glee-101',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000000',
    courseCode: 'GLEE 000',
    title: 'Sight Singing Institute',
    description: 'Intensive training in sight-reading and ear training to develop musicianship skills essential for all musicians.',
    icon: Eye,
    level: 'All Levels',
    duration: '8 Weeks',
    highlights: ['Sight Reading', 'Ear Training', 'Solfege', 'Musicianship'],
    route: '/academy/glee-000',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000101',
    courseCode: 'GW 101',
    title: 'Music Fundamentals Theory',
    description: 'Build a strong foundation in music theory including notation, rhythm, scales, intervals, chords, and basic harmony.',
    icon: BookOpen,
    level: 'Beginner',
    duration: '16 Weeks',
    highlights: ['Music Notation', 'Rhythm', 'Scales & Keys', 'Harmony Basics'],
    route: '/academy/mus-101',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'MWF 3-5 PM',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
    },
    isActive: false
  },
  {
    id: 'a0000000-0000-0000-0000-000000000100',
    courseCode: 'LH 100',
    title: 'Bowman Scholars',
    description: 'Named after Sister Thea Bowman, this program develops liturgical leaders through spiritual formation, music ministry, and worship planning.',
    icon: GraduationCap,
    level: 'Selected Scholars',
    duration: 'Semester',
    highlights: ['Liturgical Leadership', 'Worship Planning', 'Spiritual Formation', 'Ministry Development'],
    route: '/academy/lh-100',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Fine Arts 105',
      hours: 'By Appointment',
      imageUrl: 'https://supabase.gleeworld.org/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
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
