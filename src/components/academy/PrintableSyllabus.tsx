import React from 'react';
import { CourseSyllabus } from '@/config/syllabusData';

interface PrintableSyllabusProps {
  syllabus: CourseSyllabus;
}

export const PrintableSyllabus: React.FC<PrintableSyllabusProps> = ({ syllabus }) => {
  return (
    <div 
      className="max-w-4xl mx-auto print:max-w-none"
      style={{ 
        backgroundColor: '#ffffff', 
        color: '#000000',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '11pt',
        lineHeight: '1.4',
        padding: '0.75in',
      }}
    >
      {/* Header with Spelman Logo */}
      <header style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #003366', paddingBottom: '16px' }}>
        <img 
          src="/lovable-uploads/0f4599dd-da86-457f-808a-819f3ec7ae66.png" 
          alt="Spelman College" 
          style={{ height: '60px', marginBottom: '12px' }}
        />
        <h1 style={{ 
          fontSize: '24pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          margin: '0 0 4px 0',
          fontFamily: 'Georgia, serif'
        }}>
          {syllabus.courseTitle}
        </h1>
        <h2 style={{ 
          fontSize: '16pt', 
          fontWeight: 'normal', 
          color: '#003366', 
          margin: '0 0 4px 0'
        }}>
          {syllabus.courseCode}
        </h2>
        <p style={{ fontSize: '12pt', color: '#333333', margin: 0 }}>
          {syllabus.term}
        </p>
      </header>

      {/* Instructor Information Section */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Instructor Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11pt' }}>
          <p style={{ margin: '2px 0' }}>
            <strong>Instructor:</strong> {syllabus.instructor.name}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Office:</strong> {syllabus.instructor.office}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Email:</strong> {syllabus.instructor.email}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Office Hours:</strong> {syllabus.instructor.officeHours}
          </p>
          {syllabus.instructor.phone && (
            <p style={{ margin: '2px 0' }}>
              <strong>Phone:</strong> {syllabus.instructor.phone}
            </p>
          )}
        </div>
      </section>

      {/* Course Information */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Course Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11pt' }}>
          <p style={{ margin: '2px 0' }}>
            <strong>Course Code:</strong> {syllabus.courseCode}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Credits:</strong> {syllabus.credits}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Class Time:</strong> {syllabus.classTime}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Location:</strong> {syllabus.classroom}
          </p>
        </div>
      </section>

      {/* Course Description */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Course Description
        </h2>
        <p style={{ margin: 0, textAlign: 'justify' }}>
          {syllabus.description}
        </p>
      </section>

      {/* Learning Objectives */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Learning Objectives
        </h2>
        <p style={{ marginBottom: '8px', fontStyle: 'italic', color: '#444444' }}>
          At the end of this course, students will be able to:
        </p>
        <ol style={{ margin: 0, paddingLeft: '24px' }}>
          {syllabus.objectives.map((obj, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{obj}</li>
          ))}
        </ol>
      </section>

      {/* Required Materials */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Course Materials
        </h2>
        <ul style={{ margin: 0, paddingLeft: '24px' }}>
          {syllabus.materials.map((mat, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{mat}</li>
          ))}
        </ul>
      </section>

      {/* Assignments & Activities */}
      <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Assignments & Activities
        </h2>
        {syllabus.assignments.map((assignment, i) => (
          <div key={i} style={{ marginBottom: '12px' }}>
            <h3 style={{ 
              fontSize: '11pt', 
              fontWeight: 'bold', 
              color: '#000000',
              marginBottom: '4px'
            }}>
              {assignment.name} {assignment.points && <span style={{ fontWeight: 'normal' }}>({assignment.points})</span>}
            </h3>
            <p style={{ margin: 0, paddingLeft: '16px' }}>{assignment.description}</p>
          </div>
        ))}
      </section>

      {/* Grading Policies */}
      <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Grading Policies
        </h2>
        <p style={{ marginBottom: '12px', fontStyle: 'italic' }}>
          The final grade for this course will be computed on the following basis:
        </p>
        
        {/* Grading Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '16px',
          fontSize: '10pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px', 
                borderBottom: '2px solid #003366',
                fontWeight: 'bold'
              }}>Category</th>
              {syllabus.grading[0]?.points !== undefined && (
                <th style={{ 
                  textAlign: 'center', 
                  padding: '8px', 
                  borderBottom: '2px solid #003366',
                  fontWeight: 'bold',
                  width: '80px'
                }}>Points</th>
              )}
              <th style={{ 
                textAlign: 'center', 
                padding: '8px', 
                borderBottom: '2px solid #003366',
                fontWeight: 'bold',
                width: '80px'
              }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {syllabus.grading.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #cccccc' }}>
                <td style={{ padding: '6px 8px' }}>{item.name}</td>
                {item.points !== undefined && (
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.points}</td>
                )}
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.weight}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', borderTop: '2px solid #003366' }}>
              <td style={{ padding: '8px' }}>Total</td>
              {syllabus.grading[0]?.points !== undefined && (
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {syllabus.grading.reduce((sum, g) => sum + (g.points || 0), 0)}
                </td>
              )}
              <td style={{ padding: '8px', textAlign: 'center' }}>100%</td>
            </tr>
          </tbody>
        </table>

        {/* Grading Scale */}
        <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '8px' }}>Grading Scale</h3>
        <table style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
          <tbody>
            {syllabus.gradingScale.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 16px 2px 0', fontWeight: 'bold', width: '40px' }}>{item.grade}</td>
                <td style={{ padding: '2px 0' }}>{item.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Course Policies */}
      <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Course Policies
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '6px' }}>Attendance Policy</h3>
          <p style={{ margin: 0, textAlign: 'justify' }}>{syllabus.attendancePolicy}</p>
        </div>

        {syllabus.lateWorkPolicy && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '6px' }}>Late Work Policy</h3>
            <p style={{ margin: 0, textAlign: 'justify' }}>{syllabus.lateWorkPolicy}</p>
          </div>
        )}
      </section>

      {/* Course Schedule */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Course Schedule
        </h2>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '9pt'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#003366', color: '#ffffff' }}>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px', 
                width: '70px',
                fontWeight: 'bold'
              }}>Week</th>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px',
                fontWeight: 'bold'
              }}>Topics</th>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px',
                width: '140px',
                fontWeight: 'bold'
              }}>Assignments</th>
            </tr>
          </thead>
          <tbody>
            {syllabus.schedule.map((week, i) => (
              <tr key={week.week} style={{ 
                borderBottom: '1px solid #dddddd',
                backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f8f8',
                pageBreakInside: 'avoid'
              }}>
                <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                  <strong>{week.week}</strong>
                  {week.date && (
                    <div style={{ fontSize: '8pt', color: '#666666' }}>{week.date}</div>
                  )}
                </td>
                <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                  <strong>{week.title}</strong>
                  {week.description && (
                    <div style={{ fontSize: '9pt', color: '#444444', marginTop: '2px' }}>
                      {week.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '6px 8px', verticalAlign: 'top', color: '#444444' }}>
                  {week.assignments || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Student Access Statement */}
      <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Student Access Statement
        </h2>
        <p style={{ margin: 0, textAlign: 'justify', fontSize: '10pt' }}>
          {syllabus.accessStatement}
        </p>
      </section>

      {/* Academic Integrity */}
      <section style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h2 style={{ 
          fontSize: '14pt', 
          fontWeight: 'bold', 
          color: '#003366', 
          borderBottom: '2px solid #003366',
          paddingBottom: '4px',
          marginBottom: '12px'
        }}>
          Academic Integrity Policy
        </h2>
        <p style={{ margin: 0, textAlign: 'justify', fontSize: '10pt' }}>
          {syllabus.academicIntegrity}
        </p>
      </section>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        marginTop: '32px', 
        paddingTop: '16px', 
        borderTop: '2px solid #003366',
        fontSize: '9pt',
        color: '#666666'
      }}>
        <p style={{ margin: '0 0 4px 0' }}>
          <em>This syllabus is subject to change at the discretion of the instructor.</em>
        </p>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#003366' }}>
          Spelman College • Department of Music • {syllabus.term}
        </p>
      </footer>
    </div>
  );
};

export default PrintableSyllabus;
