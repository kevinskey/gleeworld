import React from 'react';
import { CourseTemplate } from '@/components/academy/CourseTemplate';

export default function ChoralConductingLiterature() {
  const courseData = {
    courseId: 'mus-210-conducting',
    courseCode: 'MUS 210',
    title: 'Conducting for the Complete Musician',
    credits: 2,
    meetingTimes: 'MW — 2× per week (50 min)',
    location: 'Fine Arts 109',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Fine Arts 105',
      officeHours: 'MWF 3–5 PM or appointment'
    },
    purpose: 'This course develops the complete modern conductor. Students gain baton technique, expressive gesture, score analysis methods, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, and contemporary choral traditions. Emphasis is placed on artistry, leadership, and practical rehearsal skills.',
    objectives: [
      'Demonstrate proper baton and expressive gesture technique.',
      'Conduct beat patterns in multiple meters and tempi.',
      'Employ advanced conducting techniques (phrase shaping, left hand, fermatas, releases, tempo changes).',
      'Analyze choral scores for harmony, text, structure, and style.',
      'Demonstrate musicianship skills essential for conducting success.',
      'Define major choral forms, styles, and terms.',
      'Understand ensemble setup, balance, instrumentation, and seating.',
      'Memorize and conduct 30 minutes of a major choral work.',
      'Identify online and print choral resources.',
      'Conduct rehearsals in real ensemble settings.'
    ],
    requiredTexts: [
      { title: 'A Survey of Choral Music', author: 'Homer Ulrich' },
      { title: 'The Modern Conductor', author: 'Elizabeth Green & Mark Gibson' }
    ],
    requiredMaterials: [
      'Baton',
      'Video recording device',
      'Internet access',
      'Pencil (No. 2)'
    ],
    attendancePolicy: `Students may miss 2 classes without penalty.
Each additional absence lowers the final grade by one letter.
Four absences result in removal from the class (unless documented emergencies).
Three tardies = 1 absence.`,
    gradingBreakdown: [
      { item: 'Class Participation', percentage: 15 },
      { item: '5 Choral Warm-Ups (PDF)', percentage: 20 },
      { item: '30-Minute Major Work (Final Project)', percentage: 20 },
      { item: 'Midterm Exam', percentage: 15 },
      { item: 'Final Exam', percentage: 15 },
      { item: 'Period Presentations', percentage: 15 }
    ],
    weeklySchedule: [
      { week: 1, dates: 'Jan 14 & 16', topics: ['Course introduction', 'Posture, window, meter', 'Basic conducting patterns', 'Diagnostic video'] },
      { week: 2, dates: 'Jan 21 & 23', topics: ['Patterns continued', '"Choral Conductor as Leader" presentations', 'Conducting Exercise 1'] },
      { week: 3, dates: 'Jan 28 & 30', topics: ['Pattern refinement', 'Conducting Exercise 2'] },
      { week: 4, dates: 'Feb 4 & 6', topics: ['Renaissance presentations', 'Renaissance style & practice'] },
      { week: 5, dates: 'Feb 11 & 13', topics: ['Renaissance Conducting Exam'] },
      { week: 6, dates: 'Feb 18 & 20', topics: ['Baroque presentations'] },
      { week: 7, dates: 'Feb 25 & 27', topics: ['Baroque Conducting Exam'] },
      { week: 8, dates: 'March 5 & 6', topics: ['MIDTERM EXAM WEEK', 'Conducting Exercise 3', 'Classical presentations', 'Midterm practical & written'] },
      { week: 9, dates: 'March 9–13', topics: ['SPRING BREAK — No Classes'] },
      { week: 10, dates: 'March 17 & 19', topics: ['Classical conducting', 'Classical Conducting Exam'] },
      { week: 11, dates: 'March 24 & 26', topics: ['Romantic presentations'] },
      { week: 12, dates: 'March 31 & April 2', topics: ['Romantic Conducting Exam', 'Conducting Exercise 4', 'Negro Spirituals presentations'] },
      { week: 13, dates: 'April 7 & 9', topics: ['Negro Spirituals Conducting Exam'] },
      { week: 14, dates: 'April 14 & 16', topics: ['Gospel presentations'] },
      { week: 15, dates: 'April 21 & 23', topics: ['Gospel Conducting Exam', 'Final project coaching'] },
      { week: 16, dates: 'April 28 & 29', topics: ['Final project practice', 'Course evaluations'] },
      { week: 17, dates: 'May 4–8', topics: ['FINAL EXAM WEEK', 'Conduct 30-Minute Final Project', 'Written Final Exam'] }
    ],
    assignments: [
      'Complete assigned readings and weekly conducting labs',
      'Prepare 5 original choral warm-ups (PDF)',
      'Present historical periods with one-page handout',
      'Conduct one work from each major musical era',
      'Midterm written + practical exam',
      'Final project: 30 minutes of a major work by memory'
    ],
    disabilityStatement: 'Students requiring accommodations should contact the Office of Disability Services (MacVicar Hall, 404-223-7590) for coordination.',
    academicHonestyStatement: 'All submitted work must be original and comply with Spelman\'s Code of Conduct regarding academic integrity.',
    textbookIframeUrl: 'https://gamma.app/embed/qpwgjhqyohq63uo'
  };

  return <CourseTemplate {...courseData} />;
}
