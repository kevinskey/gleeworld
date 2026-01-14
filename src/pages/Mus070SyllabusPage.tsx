import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { SyllabusTemplate } from '@/components/academy/syllabus/SyllabusTemplate';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Mus070SyllabusPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-background">
        {/* Action Bar - hidden in print */}
        <div className="print:hidden sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Syllabus
            </Button>
          </div>
        </div>

        {/* Syllabus Content */}
        <SyllabusTemplate 
          courseCode="MUS 070"
          courseTitle="Glee Club"
          term="Spring 2026"
          credits={1}
          classTime="Monday & Wednesday, 12:00–1:00 PM"
          classroom="Fine Arts Building"
          instructorName="Dr. Kevin Johnson"
          instructorEmail="kjohns10@spelman.edu"
          instructorPhone="470-622-1392"
          instructorOffice="Fine Arts 105"
          officeHours="Monday & Wednesday, 3:00–5:00 PM (or by appointment)"
        />
      </div>
    </UniversalLayout>
  );
};

export default Mus070SyllabusPage;
