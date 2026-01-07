import React from 'react';
import { CourseTemplate } from '@/components/academy/CourseTemplate';

export default function ChoralConductingLiterature() {
  const courseData = {
    courseId: 'mus-210-conducting',
    courseCode: 'MUS 210',
    title: 'Choral Conducting and Literature',
    credits: 2,
    meetingTimes: 'MW — 2× per week (50 min)',
    location: 'LLC II Auditorium',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@spelman.edu',
      office: 'Milligan 2303C',
      officeHours: 'MWF 3–5 PM or by appointment',
      phone: '404-270-5480'
    },
    purpose: 'A focus on conducting skills, choral literature, and techniques for organizing different choral ensembles. Students are expected to have skills in sight singing and playing the piano. Designed for music majors and minors only.',
    objectives: [
      'Demonstrate good baton technique.',
      'Conduct beat patterns in various tempi.',
      'Employ advanced conducting techniques (expressive gestures, phrasing, tempo changes, cut-offs, left hand independence, fermata, melding).',
      'Understand score structure and use score study as a conducting tool.',
      'Understand the role musicianship plays in conducting success.',
      'Define major choral forms, musical styles and choral music terminology.',
      'Define instrumentation and seating arrangements relating to conducting.',
      'Conduct 30 minutes of a major choral work by memory.',
      'Identify choral resources on the Internet.',
      'Conduct choral rehearsals in the City of Atlanta.'
    ],
    requiredTexts: [
      { title: 'A Survey of Choral Music', author: 'Homer Ulrich' },
      { title: 'The Modern Conductor', author: 'Elizabeth Green & Mark Gibson' }
    ],
    requiredMaterials: [
      'Baton',
      'Video recording device',
      'Internet access (DSL, LAN, or cable connection recommended)',
      'Pencil (No. 2)'
    ],
    attendancePolicy: `Students may miss 2 classes without penalty.
Each additional absence lowers the final grade by one letter.
Four absences result in removal from the class (unless documented emergencies).
Three tardies = 1 absence. A tardy is issued when any student is not in the classroom when class begins.`,
    lateAssignmentPolicy: 'Students are expected to turn in assignments on time. However, if an assignment is turned in late, the letter grade earned will be reduced by one letter grade for each day it is late.',
    gradingBreakdown: [
      { item: 'Class Participation', percentage: 15 },
      { item: '5 Choral Warm-Ups (PDF)', percentage: 20 },
      { item: '30-Minute Major Work (Final Project)', percentage: 20 },
      { item: 'Midterm Exam', percentage: 15 },
      { item: 'Final Exam', percentage: 15 },
      { item: 'Oral Presentations', percentage: 15 }
    ],
    weeklySchedule: [
      { week: 1, dates: 'Week 1', topics: ['Window/Posture/Meter/Patterns', 'Introduction to conducting fundamentals'] },
      { week: 2, dates: 'Week 2', topics: ['Window/Posture/Meter/Patterns continued', '"Choral Conductor as Leader" Group Presentations', 'Conducting Exercise 1'] },
      { week: 3, dates: 'Week 3', topics: ['Window/Posture/Meter/Patterns refinement', 'Conducting Exercise 2'] },
      { week: 4, dates: 'Week 4', topics: ['Window/Posture/Meter/Patterns', 'Renaissance Presentations'] },
      { week: 5, dates: 'Week 5', topics: ['Renaissance Conducting Exam'] },
      { week: 6, dates: 'Week 6', topics: ['Baroque Presentations'] },
      { week: 7, dates: 'Week 7', topics: ['Baroque Conducting Exam'] },
      { week: 8, dates: 'Week 8', topics: ['MIDTERM WEEK', 'Conducting Exercise 3', 'Classical Presentations'] },
      { week: 9, dates: 'Week 9', topics: ['Classical Conducting Exam'] },
      { week: 10, dates: 'Week 10', topics: ['Romantic Presentations'] },
      { week: 11, dates: 'Week 11', topics: ['Romantic Conducting Exam'] },
      { week: 12, dates: 'Week 12', topics: ['Conducting Exercise 4', 'Negro Spiritual Presentations'] },
      { week: 13, dates: 'Week 13', topics: ['Negro Spiritual Conducting Exam'] },
      { week: 14, dates: 'Week 14', topics: ['Gospel Presentations'] },
      { week: 15, dates: 'Week 15', topics: ['Gospel Conducting Exam'] },
      { week: 16, dates: 'Week 16', topics: ['Final Project Practice', 'Course evaluations'] },
      { week: 17, dates: 'Final Exam Week', topics: ['Conduct 30-Minute Final Project', 'Written Final Exam'] }
    ],
    assignments: [
      'Purchase textbook and other supplementary materials',
      'Participate in class activities, conducting exercises and discussions',
      'Conduct one work from each musical period during class',
      'Prepare 5 choral warm-ups to be distributed to each class member (PDF)',
      'Conduct 30-minute major choral work by memory as a final project',
      'Take midterm and final exams covering topics discussed during class and contained in textbook reading assignments',
      'Prepare in-class oral presentations for each music period with typed one-page paper handout'
    ],
    courseStructure: 'This course will be delivered in-person, through the course management system SpeleLearn (Canvas). Throughout the semester, you will participate in a blend of individual and group activities. Course activities will consist of reading book chapters, viewing presentations, viewing videos, listening to music, discussion forums, online quizzes and tests, and group assignments.',
    disabilityStatement: 'Any student who feels she may need an accommodation based on the impact of a disability should contact the Office of Disability Services privately to discuss her specific needs. Please contact the Office of Disability Services at (404) 223-7590 in MacVicar Hall to coordinate reasonable accommodations.',
    academicHonestyStatement: 'The Spelman College community is committed to maintaining the integrity of the College and its academic programs. Each student is required to abide by Spelman\'s code of conduct and is expected to produce work that reflects her own ideas. Academic dishonesty will not be tolerated.',
    textbookIframeUrl: 'https://gamma.app/embed/qpwgjhqyohq63uo'
  };

  return <CourseTemplate {...courseData} />;
}
