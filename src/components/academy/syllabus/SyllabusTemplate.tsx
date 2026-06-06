import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SyllabusTemplateProps {
  courseCode?: string;
  courseTitle?: string;
  term?: string;
  credits?: number;
  classTime?: string;
  classroom?: string;
  instructorName?: string;
  instructorEmail?: string;
  instructorPhone?: string;
  instructorOffice?: string;
  officeHours?: string;
}

export const SyllabusTemplate: React.FC<SyllabusTemplateProps> = ({
  courseCode = '',
  courseTitle = '',
  term = '',
  credits,
  classTime = '',
  classroom = '',
  instructorName = '',
  instructorEmail = '',
  instructorPhone = '',
  instructorOffice = '',
  officeHours = '',
}) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 bg-background text-foreground print:p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <img 
            src="/lovable-uploads/0f4599dd-da86-457f-808a-819f3ec7ae66.png" 
            alt="Riverside Music Institute Logo" 
            className="h-16 md:h-20 object-contain"
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          {courseCode || '[Course Code]'}: {courseTitle || '[Course Title]'}
        </h1>
        <p className="text-lg text-foreground/80">{term || '[Term/Semester]'}</p>
      </header>

      <Separator className="my-6" />

      {/* Course Information */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Course Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p><span className="font-medium text-foreground/70">Course Code:</span> {courseCode || '________'}</p>
            <p><span className="font-medium text-foreground/70">Credits:</span> {credits ?? '________'}</p>
            <p><span className="font-medium text-foreground/70">Class Time:</span> {classTime || '________'}</p>
            <p><span className="font-medium text-foreground/70">Classroom:</span> {classroom || '________'}</p>
          </div>
          <div className="space-y-2">
            <p><span className="font-medium text-foreground/70">Prerequisite:</span> ________</p>
          </div>
        </div>
      </section>

      {/* Instructor Information */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Instructor Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p><span className="font-medium text-foreground/70">Instructor:</span> {instructorName || '________'}</p>
            <p><span className="font-medium text-foreground/70">Email:</span> {instructorEmail || '________'}</p>
            <p><span className="font-medium text-foreground/70">Phone:</span> {instructorPhone || '________'}</p>
          </div>
          <div className="space-y-2">
            <p><span className="font-medium text-foreground/70">Office:</span> {instructorOffice || '________'}</p>
            <p><span className="font-medium text-foreground/70">Office Hours:</span> {officeHours || '________'}</p>
          </div>
        </div>
      </section>

      {/* Course Description */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Course Description
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          ________________________________________________________________
          ________________________________________________________________
          ________________________________________________________________
        </p>
      </section>

      {/* Course Objectives */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Course Objectives
        </h2>
        <p className="text-foreground/70 mb-3">At the end of this course, students will be able to:</p>
        <ol className="list-decimal list-inside space-y-2 text-foreground/80">
          <li>________________________________________</li>
          <li>________________________________________</li>
          <li>________________________________________</li>
          <li>________________________________________</li>
          <li>________________________________________</li>
          <li>________________________________________</li>
        </ol>
      </section>

      {/* Course Materials */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Required Materials
        </h2>
        <ul className="list-disc list-inside space-y-2 text-foreground/80">
          <li>________________________________________</li>
          <li>________________________________________</li>
          <li>________________________________________</li>
        </ul>
      </section>

      {/* Assignments */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Assignments & Activities
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-foreground mb-1">Assignment Type 1</h3>
            <p className="text-foreground/70">________________________________________</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Assignment Type 2</h3>
            <p className="text-foreground/70">________________________________________</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Assignment Type 3</h3>
            <p className="text-foreground/70">________________________________________</p>
          </div>
        </div>
      </section>

      {/* Grading */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Grading Policies
        </h2>
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/20">
                  <th className="text-left py-2 font-semibold text-foreground">Component</th>
                  <th className="text-right py-2 font-semibold text-foreground">Weight</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr className="border-b border-foreground/10">
                  <td className="py-2">________________</td>
                  <td className="text-right py-2">____%</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-2">________________</td>
                  <td className="text-right py-2">____%</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-2">________________</td>
                  <td className="text-right py-2">____%</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="text-right py-2">100%</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Grading Scale */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Grading Scale
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'].map((grade) => (
            <div key={grade} className="flex justify-between text-foreground/80 border-b border-foreground/10 py-1">
              <span className="font-medium">{grade}</span>
              <span>_____%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Attendance Policy */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Attendance Policy
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          ________________________________________________________________
          ________________________________________________________________
          ________________________________________________________________
        </p>
      </section>

      {/* Academic Integrity */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Academic Integrity Policy
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          At the heart of Riverside Music Institute's mission is academic excellence, along with the development 
          of intellectual, ethical and leadership qualities. All members of the academic community are 
          expected to follow the basic standards of honesty and integrity as outlined in the Brand 
          College Code of Conduct.
        </p>
      </section>

      {/* Student Access Statement */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Student Access Statement
        </h2>
        <p className="text-foreground/80 leading-relaxed">
          Riverside Music Institute is committed to ensuring the full participation of all students in its programs. 
          If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. 
          Located in MacVicar Hall, Room 106.
        </p>
      </section>

      {/* Weekly Schedule */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
          Course Schedule
        </h2>
        <Card className="bg-muted/30 border-0 overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Week</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Topics</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Assignments Due</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <tr key={week} className="border-b border-foreground/10">
                    <td className="py-3 px-4 font-medium">Week {week}</td>
                    <td className="py-3 px-4">________________</td>
                    <td className="py-3 px-4">________________</td>
                  </tr>
                ))}
                <tr className="border-b border-foreground/10 bg-muted/20">
                  <td className="py-3 px-4 font-medium" colSpan={3}>Midterm Week</td>
                </tr>
                {[9, 10, 11, 12, 13, 14, 15, 16].map((week) => (
                  <tr key={week} className="border-b border-foreground/10">
                    <td className="py-3 px-4 font-medium">Week {week}</td>
                    <td className="py-3 px-4">________________</td>
                    <td className="py-3 px-4">________________</td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td className="py-3 px-4 font-medium" colSpan={3}>Finals Week</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-foreground/60 mt-10 pt-6 border-t border-foreground/20">
        <p>This syllabus is subject to change at the discretion of the instructor.</p>
        <p className="mt-2">Riverside Music Institute • Department of Music</p>
      </footer>
    </div>
  );
};

export default SyllabusTemplate;
