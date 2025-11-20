/**
 * Centralized grading utility for consistent letter grade calculation
 * across the entire application
 */

export interface GradeScale {
  threshold: number;
  grade: string;
}

/**
 * MUS240 Syllabus Grading Scale
 * Matches the official grading policy from the course syllabus
 */
const STANDARD_GRADE_SCALE: GradeScale[] = [
  { threshold: 95, grade: 'A' },
  { threshold: 90, grade: 'A-' },
  { threshold: 87, grade: 'B+' },
  { threshold: 83, grade: 'B' },
  { threshold: 80, grade: 'B-' },
  { threshold: 77, grade: 'C+' },
  { threshold: 73, grade: 'C' },
  { threshold: 70, grade: 'C-' },
  { threshold: 65, grade: 'D+' },
  { threshold: 60, grade: 'D' },
  { threshold: 0, grade: 'F' }
];

/**
 * Calculate letter grade from score and max points using MUS240 syllabus scale
 * @param score - Points earned
 * @param maxPoints - Maximum possible points
 * @returns Letter grade (A through F, no A+ or D-)
 */
export function calculateLetterGrade(score: number, maxPoints: number): string {
  if (maxPoints === 0) return 'F';
  
  const percentage = (score / maxPoints) * 100;
  
  for (const { threshold, grade } of STANDARD_GRADE_SCALE) {
    if (percentage >= threshold) {
      return grade;
    }
  }
  
  return 'F';
}

/**
 * Get color styling for a letter grade
 * @param letterGrade - Letter grade (A through F)
 * @returns Tailwind CSS classes for styling
 */
export function getLetterGradeColor(letterGrade: string): string {
  if (letterGrade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
  if (letterGrade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (letterGrade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (letterGrade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

/**
 * Get score color based on percentage
 * @param score - Points earned
 * @param maxScore - Maximum possible points
 * @returns Tailwind CSS color class
 */
export function getScoreColor(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 80) return 'text-blue-600';
  if (percentage >= 70) return 'text-yellow-600';
  if (percentage >= 60) return 'text-orange-600';
  return 'text-red-600';
}
