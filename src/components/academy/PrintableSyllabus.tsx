import React from 'react';
import { CourseSyllabus } from '@/config/syllabusData';

interface PrintableSyllabusProps {
  syllabus: CourseSyllabus;
}

export const PrintableSyllabus: React.FC<PrintableSyllabusProps> = ({ syllabus }) => {
  // Blue color matching the PDF style
  const blueColor = '#0078D4';
  
  return (
    <div 
      className="max-w-4xl mx-auto print:max-w-none"
      style={{ 
        backgroundColor: '#ffffff', 
        color: '#000000',
        fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
        fontSize: '12pt',
        lineHeight: '1.5',
        padding: '0.75in',
        position: 'relative',
        minHeight: '100%',
      }}
    >
      {/* Header - Large Title */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '36pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 4px 0',
          letterSpacing: '-0.5px',
        }}>
          {syllabus.courseTitle}
        </h1>
        <p style={{ 
          fontSize: '14pt', 
          color: '#666666', 
          margin: '0 0 2px 0'
        }}>
          {syllabus.courseCode}
        </p>
        <p style={{ 
          fontSize: '14pt', 
          color: '#000000', 
          margin: 0,
          textDecoration: 'underline'
        }}>
          {syllabus.term}
        </p>
      </header>

      {/* Instructor Information Section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Instructor Information
        </h2>
        <div style={{ fontSize: '11pt', lineHeight: '1.6' }}>
          <p style={{ margin: '2px 0' }}>
            Instructor: {syllabus.instructor.name}
          </p>
          <p style={{ margin: '2px 0' }}>
            Office: {syllabus.instructor.office}
          </p>
          <p style={{ margin: '2px 0' }}>
            {syllabus.instructor.officeHours}
          </p>
          {syllabus.instructor.phone && (
            <p style={{ margin: '2px 0' }}>
              Phone: {syllabus.instructor.phone}
            </p>
          )}
          <p style={{ margin: '2px 0' }}>
            Email: <span style={{ color: blueColor }}>{syllabus.instructor.email}</span>
          </p>
        </div>
      </section>

      {/* Course Description */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Course Description
        </h2>
        <p style={{ margin: 0, textAlign: 'left' }}>
          {syllabus.description}
        </p>
      </section>

      {/* Learning Objectives */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Learning Objectives
        </h2>
        <ol style={{ margin: 0, paddingLeft: '24px' }}>
          {syllabus.objectives.map((obj, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{obj}</li>
          ))}
        </ol>
      </section>

      {/* Course Materials */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Course Materials
        </h2>
        <ul style={{ margin: 0, paddingLeft: '24px', listStyleType: 'disc' }}>
          {syllabus.materials.map((mat, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{mat}</li>
          ))}
        </ul>
      </section>

      {/* Assignments & Activities */}
      <section style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Assignments/Activities
        </h2>
        {syllabus.assignments.map((assignment, i) => (
          <div key={i} style={{ marginBottom: '12px' }}>
            <h3 style={{ 
              fontSize: '12pt', 
              fontWeight: 'bold', 
              color: '#000000',
              margin: '0 0 4px 0'
            }}>
              {assignment.name}
            </h3>
            <p style={{ margin: 0, paddingLeft: '0' }}>{assignment.description}</p>
          </div>
        ))}
      </section>

      {/* Grading Policies */}
      <section style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Grading Policies
        </h2>
        <p style={{ marginBottom: '12px' }}>
          The final grade for this course will be computed on the following basis:
        </p>
        
        {/* Grading Breakdown as bullet list */}
        <ul style={{ margin: '0 0 16px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
          {syllabus.grading.map((item, i) => (
            <li key={i} style={{ marginBottom: '2px' }}>
              {item.name} {item.weight}
            </li>
          ))}
        </ul>

        <p style={{ marginBottom: '12px' }}>
          {syllabus.lateWorkPolicy || 'Late work will be assigned a lower grade to be determined by instructor. Work must be turned in online by the stated deadline unless indicated otherwise.'}
        </p>

        {/* Grading Scale */}
        <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '16px 0 8px 0' }}>Grading Scale is as follows:</h3>
        <table style={{ borderCollapse: 'collapse', fontSize: '11pt' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 24px 4px 0', borderBottom: '1px solid #ccc' }}>Grade</th>
              <th style={{ textAlign: 'left', padding: '4px 0', borderBottom: '1px solid #ccc' }}>Ranges</th>
            </tr>
          </thead>
          <tbody>
            {syllabus.gradingScale.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 24px 2px 0' }}>{item.grade}</td>
                <td style={{ padding: '2px 0' }}>{item.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Attendance Policy */}
      <section style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
        <p style={{ margin: 0 }}>
          {syllabus.attendancePolicy}
        </p>
      </section>

      {/* Schedule Section - if exists and has items */}
      {syllabus.schedule && syllabus.schedule.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '16pt', 
            fontWeight: 'normal', 
            color: blueColor, 
            margin: '0 0 8px 0'
          }}>
            Schedule
          </h2>
          <p style={{ marginBottom: '12px' }}>
            Regularly scheduled class sessions will consist of announcements, warm-ups, music reading, followed by rehearsal of selected literature or lecture content. The material covered in each session will depend upon the ensemble's or class's progress.
          </p>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '10pt'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '6px 8px', 
                  width: '60px',
                  fontWeight: 'bold'
                }}>Week</th>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '6px 8px',
                  fontWeight: 'bold'
                }}>Topics</th>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '6px 8px',
                  width: '140px',
                  fontWeight: 'bold'
                }}>Assignments</th>
              </tr>
            </thead>
            <tbody>
              {syllabus.schedule.map((week, i) => (
                <tr key={week.week} style={{ 
                  borderBottom: '1px solid #eee',
                  pageBreakInside: 'avoid'
                }}>
                  <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                    {week.week}
                    {week.date && (
                      <div style={{ fontSize: '9pt', color: '#666666' }}>{week.date}</div>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                    <strong>{week.title}</strong>
                    {week.description && (
                      <div style={{ fontSize: '10pt', color: '#444444', marginTop: '2px' }}>
                        {week.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', verticalAlign: 'top', color: '#444444' }}>
                    {week.assignments || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Student Access Statement */}
      <section style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Student Access Statement
        </h2>
        <p style={{ margin: 0, fontSize: '10pt' }}>
          {syllabus.accessStatement}
        </p>
      </section>

      {/* Academic Integrity */}
      <section style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: blueColor, 
          margin: '0 0 8px 0'
        }}>
          Academic Integrity Policy
        </h2>
        <p style={{ margin: 0, fontSize: '10pt' }}>
          {syllabus.academicIntegrity}
        </p>
      </section>

      {/* Footer */}
      <footer style={{ 
        position: 'absolute',
        bottom: '0.5in',
        right: '0.75in',
        fontSize: '10pt',
        color: blueColor,
      }}>
        {syllabus.courseCode} | {syllabus.term}
      </footer>
    </div>
  );
};

export default PrintableSyllabus;
