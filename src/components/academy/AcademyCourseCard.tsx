import React from 'react';
import { Button } from '@/components/ui/button';
import { AcademyCourse } from '@/config/academyCourses';

// Character limit for description to ensure uniform card height
const DESCRIPTION_CHAR_LIMIT = 120;
interface AcademyCourseCardProps {
  course: AcademyCourse;
  onEnter: (course: AcademyCourse) => void;
  buttonText?: string;
  className?: string;
}

/**
 * Standardized Academy Course Card
 * Use this component for ALL course card displays across the app.
 * Design based on the established card template with:
 * - Course code in elegant serif font
 * - Italic course title
 * - Truncated description for uniform height
 * - Subtle drop shadow
 * - Rounded "Enter Course" button
 */
export const AcademyCourseCard: React.FC<AcademyCourseCardProps> = ({
  course,
  onEnter,
  buttonText = 'Enter Course',
  className = ''
}) => {
  // Truncate description to ensure uniform card height
  const truncatedDescription = course.description.length > DESCRIPTION_CHAR_LIMIT ? `${course.description.slice(0, DESCRIPTION_CHAR_LIMIT).trim()}...` : course.description;
  return <div className={`
        bg-white 
        border border-border/40
        rounded-xl
        p-3 sm:p-6 md:p-8
        flex flex-col
        h-full
        min-h-[180px] sm:min-h-[280px]
        shadow-lg
        hover:shadow-xl
        transition-shadow
        duration-200
        ${className}
      `}>
      {/* Course Code - Elegant serif style */}
      <h3 className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-light tracking-wide text-foreground mb-1 sm:mb-2" style={{
      fontFamily: 'Georgia, "Times New Roman", serif'
    }}>
        {course.courseCode}
      </h3>

      {/* Course Title - Italic style */}
      <h4 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-semibold text-[#003666] italic mb-2 sm:mb-4 leading-snug line-clamp-2">
        {course.title}
      </h4>

      {/* Description - Fixed height with truncation */}
      <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed flex-1 mb-3 sm:mb-6 antialiased line-clamp-3 sm:line-clamp-none">
        {truncatedDescription}
      </p>

      {/* Enter Course Button - Rounded pill style */}
      <Button variant="outline" onClick={e => {
      e.stopPropagation();
      onEnter(course);
    }} className="
          w-fit
          px-3 sm:px-6 py-1.5 sm:py-2
          rounded-full
          border-[#003666]
          text-[#003666]
          bg-transparent
          hover:bg-[#003666]
          hover:text-white
          transition-colors
          font-medium
          text-xs sm:text-sm
        ">
        {buttonText}
      </Button>
    </div>;
};
export default AcademyCourseCard;