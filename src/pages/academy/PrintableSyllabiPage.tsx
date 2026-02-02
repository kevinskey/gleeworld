import React, { useState, useRef } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PrintableSyllabus } from '@/components/academy/PrintableSyllabus';
import { getAllSyllabi, getSyllabus, CourseSyllabus } from '@/config/syllabusData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, FileDown, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrintableSyllabiPage() {
  const allSyllabi = getAllSyllabi();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedSyllabus = allSyllabi[selectedIndex];

  const handlePrint = () => {
    window.print();
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allSyllabi.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < allSyllabi.length - 1 ? prev + 1 : 0));
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header - Hidden in print */}
        <div className="print:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to="/academy">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Academy
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Printable Syllabi
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {allSyllabi.length} courses available
                  </p>
                </div>
              </div>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Current Syllabus
              </Button>
            </div>
          </div>
        </div>

        {/* Course Selector - Hidden in print */}
        <div className="print:hidden max-w-6xl mx-auto px-4 py-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-900 dark:text-white">Select Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {allSyllabi.map((syllabus, index) => (
                    <Button
                      key={syllabus.courseCode}
                      variant={index === selectedIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedIndex(index)}
                      className="text-xs whitespace-nowrap"
                    >
                      {syllabus.courseCode}
                    </Button>
                  ))}
                </div>

                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedSyllabus.courseCode}: {selectedSyllabus.courseTitle}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedSyllabus.credits} credit(s) • {selectedSyllabus.instructor.name} • {selectedSyllabus.term}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Printable Content */}
        <div className="max-w-6xl mx-auto px-4 pb-8 print:px-0 print:pb-0 print:max-w-none">
          <div 
            ref={printRef} 
            className="shadow-lg print:shadow-none rounded-lg print:rounded-none overflow-hidden"
            style={{ backgroundColor: '#ffffff' }}
          >
            <PrintableSyllabus syllabus={selectedSyllabus} />
          </div>
        </div>

        {/* Print All Option - Hidden in print */}
        <div className="print:hidden max-w-6xl mx-auto px-4 pb-8">
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-amber-900 dark:text-amber-100">Print All Syllabi</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    To print all syllabi, use the buttons above to navigate to each course and print individually.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100">
                    <FileDown className="h-4 w-4" />
                    Download as PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </UniversalLayout>
  );
}
