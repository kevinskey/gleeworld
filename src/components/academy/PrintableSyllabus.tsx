import React from 'react';
import { CourseSyllabus } from '@/config/syllabusData';
import { Separator } from '@/components/ui/separator';

interface PrintableSyllabusProps {
  syllabus: CourseSyllabus;
}

export const PrintableSyllabus: React.FC<PrintableSyllabusProps> = ({ syllabus }) => {
  return (
    <div 
      className="max-w-4xl mx-auto p-8 print:p-6"
      style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}
    >
      {/* Header */}
      <header className="text-center mb-6 print:mb-4">
        <div className="flex justify-center mb-4 print:mb-2">
          <img 
            src="/lovable-uploads/0f4599dd-da86-457f-808a-819f3ec7ae66.png" 
            alt="Spelman College" 
            className="h-16 print:h-12 object-contain"
          />
        </div>
        <h1 
          className="text-2xl print:text-xl font-bold mb-1"
          style={{ color: '#000000' }}
        >
          {syllabus.courseCode}: {syllabus.courseTitle}
        </h1>
        <p className="text-lg print:text-base" style={{ color: '#374151' }}>{syllabus.term}</p>
      </header>

      <Separator className="my-4 print:my-2" style={{ backgroundColor: '#d1d5db' }} />

      {/* Course & Instructor Information */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-3 print:mb-2 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Course Information
        </h2>
        <div className="grid grid-cols-2 gap-4 print:gap-2 text-sm print:text-xs" style={{ color: '#1f2937' }}>
          <div className="space-y-1">
            <p><span className="font-medium">Course Code:</span> {syllabus.courseCode}</p>
            <p><span className="font-medium">Credits:</span> {syllabus.credits}</p>
            <p><span className="font-medium">Class Time:</span> {syllabus.classTime}</p>
            <p><span className="font-medium">Classroom:</span> {syllabus.classroom}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-medium">Instructor:</span> {syllabus.instructor.name}</p>
            <p><span className="font-medium">Email:</span> {syllabus.instructor.email}</p>
            {syllabus.instructor.phone && (
              <p><span className="font-medium">Phone:</span> {syllabus.instructor.phone}</p>
            )}
            <p><span className="font-medium">Office:</span> {syllabus.instructor.office}</p>
            <p><span className="font-medium">Office Hours:</span> {syllabus.instructor.officeHours}</p>
          </div>
        </div>
      </section>

      {/* Course Description */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Course Description
        </h2>
        <p className="text-sm print:text-xs leading-relaxed" style={{ color: '#1f2937' }}>
          {syllabus.description}
        </p>
      </section>

      {/* Learning Objectives */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Learning Objectives
        </h2>
        <p className="text-xs mb-2" style={{ color: '#4b5563' }}>At the end of this course, students will be able to:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm print:text-xs" style={{ color: '#1f2937' }}>
          {syllabus.objectives.map((obj, i) => (
            <li key={i}>{obj}</li>
          ))}
        </ol>
      </section>

      {/* Required Materials */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Required Materials
        </h2>
        <ul className="list-disc list-inside space-y-1 text-sm print:text-xs" style={{ color: '#1f2937' }}>
          {syllabus.materials.map((mat, i) => (
            <li key={i}>{mat}</li>
          ))}
        </ul>
      </section>

      {/* Assignments & Activities */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#1e40af', borderColor: '#1e40af' }}
        >
          Assignments & Activities
        </h2>
        <ul className="space-y-2 print:space-y-1 text-sm print:text-xs list-disc list-outside ml-5" style={{ color: '#1f2937' }}>
          {syllabus.assignments.map((assignment, i) => (
            <li key={i}>
              <span className="font-semibold" style={{ color: '#000000' }}>
                {assignment.name} {assignment.points && `(${assignment.points})`}:
              </span>{' '}
              {assignment.description}
            </li>
          ))}
        </ul>
        <p className="text-xs mt-3 print:mt-2 italic" style={{ color: '#4b5563' }}>
          Detailed rubrics are included in the Appendix.
        </p>
      </section>

      {/* Grading Policies */}
      <section className="mb-6 print:mb-4 print:break-inside-avoid">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#1e40af', borderColor: '#1e40af' }}
        >
          Grading Policies
        </h2>
        
        {/* Grading Table */}
        <table className="w-full border-collapse text-sm print:text-xs mb-4">
          <thead>
            <tr>
              <th className="text-left py-2 font-semibold" style={{ color: '#000000', borderBottom: '1px solid #000000' }}>Category</th>
              {syllabus.grading[0]?.points !== undefined && (
                <th className="text-left py-2 font-semibold w-20" style={{ color: '#000000', borderBottom: '1px solid #000000' }}>Points</th>
              )}
              <th className="text-left py-2 font-semibold w-24" style={{ color: '#000000', borderBottom: '1px solid #000000' }}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {syllabus.grading.map((item, i) => (
              <tr key={i}>
                <td className="py-1" style={{ color: '#000000', fontWeight: 600 }}>{item.name}</td>
                {item.points !== undefined && (
                  <td className="py-1" style={{ color: '#1f2937' }}>{item.points}</td>
                )}
                <td className="py-1" style={{ color: '#1f2937' }}>{item.weight}</td>
              </tr>
            ))}
            <tr className="font-bold" style={{ borderTop: '1px solid #000000' }}>
              <td className="py-1 pt-2" style={{ color: '#000000' }}>Total</td>
              {syllabus.grading[0]?.points !== undefined && (
                <td className="py-1 pt-2" style={{ color: '#000000' }}>
                  {syllabus.grading.reduce((sum, g) => sum + (g.points || 0), 0)}
                </td>
              )}
              <td className="py-1 pt-2" style={{ color: '#000000' }}>100%</td>
            </tr>
          </tbody>
        </table>

        {/* Grading Scale */}
        <div className="text-sm print:text-xs" style={{ color: '#1f2937' }}>
          <h3 className="font-semibold mb-1" style={{ color: '#000000' }}>Grading Scale</h3>
          <div className="space-y-0">
            {syllabus.gradingScale.map((item, i) => (
              <div key={i}>
                {item.grade} = {item.range}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="mb-6 print:mb-4 print:break-inside-avoid">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Course Policies
        </h2>
        <div className="space-y-3 print:space-y-2 text-sm print:text-xs" style={{ color: '#1f2937' }}>
          <div>
            <h3 className="font-medium" style={{ color: '#000000' }}>Attendance Policy</h3>
            <p>{syllabus.attendancePolicy}</p>
          </div>
          {syllabus.lateWorkPolicy && (
            <div>
              <h3 className="font-medium" style={{ color: '#000000' }}>Late Work Policy</h3>
              <p>{syllabus.lateWorkPolicy}</p>
            </div>
          )}
          <div>
            <h3 className="font-medium" style={{ color: '#000000' }}>Academic Integrity</h3>
            <p>{syllabus.academicIntegrity}</p>
          </div>
          <div>
            <h3 className="font-medium" style={{ color: '#000000' }}>Student Access Statement</h3>
            <p>{syllabus.accessStatement}</p>
          </div>
        </div>
      </section>

      {/* Course Schedule */}
      <section className="mb-6 print:mb-4">
        <h2 
          className="text-lg print:text-base font-semibold mb-2 print:mb-1 border-b-2 pb-1"
          style={{ color: '#000000', borderColor: '#1f2937' }}
        >
          Course Schedule
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th className="text-left py-2 px-2 font-semibold w-16" style={{ color: '#000000', border: '1px solid #d1d5db' }}>Week</th>
              <th className="text-left py-2 px-2 font-semibold" style={{ color: '#000000', border: '1px solid #d1d5db' }}>Topics</th>
              <th className="text-left py-2 px-2 font-semibold w-28" style={{ color: '#000000', border: '1px solid #d1d5db' }}>Assignments</th>
            </tr>
          </thead>
          <tbody>
            {syllabus.schedule.map((week) => (
              <tr key={week.week} className="print:break-inside-avoid">
                <td className="py-1.5 px-2 font-medium" style={{ color: '#1f2937', border: '1px solid #d1d5db' }}>
                  {week.week}
                  {week.date && <div className="text-[10px]" style={{ color: '#6b7280' }}>{week.date}</div>}
                </td>
                <td className="py-1.5 px-2" style={{ border: '1px solid #d1d5db' }}>
                  <div className="font-medium" style={{ color: '#000000' }}>{week.title}</div>
                  {week.description && (
                    <div className="text-[10px]" style={{ color: '#4b5563' }}>{week.description}</div>
                  )}
                </td>
                <td className="py-1.5 px-2" style={{ color: '#374151', border: '1px solid #d1d5db' }}>
                  {week.assignments || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs mt-8 print:mt-4 pt-4" style={{ color: '#6b7280', borderTop: '1px solid #d1d5db' }}>
        <p>This syllabus is subject to change at the discretion of the instructor.</p>
        <p className="mt-1">Spelman College • Department of Music</p>
      </footer>
    </div>
  );
};

export default PrintableSyllabus;
