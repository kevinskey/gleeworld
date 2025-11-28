import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, FileText, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MidtermExamForm } from '@/components/mus240/MidtermExamForm';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function MidtermExam() {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Navigation */}
        <div className="mb-8">
          <Link 
            to="/mus-240"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MUS 240
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-900 mb-4">
            Midterm Exam: Survey of African American Music (1840–1940)
          </h1>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="secondary" className="px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              50 minutes total
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <FileText className="h-4 w-4 mr-2" />
              100 Points Total
            </Badge>
          </div>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <BookOpen className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 pt-6">Instructions</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  This exam covers African American music and cultural history from 1840 to 1940. 
                  You will demonstrate your understanding of sacred and secular traditions, key historical events, and the music's 
                  role in shaping American identity.
                </p>
                <div className="bg-amber-600 border border-amber-700 rounded-lg p-4 flex items-start gap-3 text-white">
                  <AlertTriangle className="h-5 w-5 text-white mt-0.5" />
                  <div>
                    <p className="text-white font-medium mb-1">Important Notice</p>
                    <p className="text-white text-sm">
                      Your progress is automatically saved every 30 seconds. You can also manually save at any time. 
                      Make sure to submit your exam when complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Exam Form */}
        <MidtermExamForm />

        {/* Footer Navigation */}
        <div className="mt-12 text-center">
          <Link 
            to="/mus-240" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors bg-white rounded-lg px-6 py-3 shadow-sm border border-slate-200 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Course Home
          </Link>
        </div>
        </div>
      </div>
    </UniversalLayout>
  );
}