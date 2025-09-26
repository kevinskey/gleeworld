import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, FileText, BookOpen, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function MidtermExam() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Navigation */}
        <div className="mb-8">
          <Link 
            to="/classes/mus240" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MUS 240
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
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
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Welcome to the midterm exam. This test covers African American music and cultural history from 1840 to 1940. 
                  You will demonstrate your understanding of sacred and secular traditions, key historical events, and the music's 
                  role in shaping American identity.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-white mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium mb-1">Important Notice</p>
                    <p className="text-white text-sm">
                      This exam is <strong>closed-book</strong>. You may not use AI tools (ChatGPT, etc.). 
                      Answers must reflect our class discussions, readings, and listening assignments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Part I: Short Identifications */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">I</span>
              Part I: Short Identifications (20 minutes)
            </h2>
            <p className="text-slate-700 mb-6">
              Define and explain <strong>four</strong> of the following six terms in 5–7 sentences. Include time period, musical features, and cultural role.
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Ring shout
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Field holler
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Negro spiritual
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Blues
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Ragtime
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800 font-semibold">
                  Swing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Part II: Listening/Analysis */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">II</span>
              Part II: Listening/Analysis (15 minutes)
            </h2>
            <p className="text-slate-700 mb-6">
              You will hear two short excerpts from our class playlist (e.g., Fisk Jubilee Singers, Bessie Smith, Joplin, Armstrong, Ellington). For each:
            </p>
            
            <div className="bg-slate-100 rounded-lg p-6">
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Identify the genre.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Point out two musical features (form, rhythm, timbre, texture, harmony).
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Briefly connect the piece to its cultural or historical context.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Part III: Short Essay */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">III</span>
              Part III: Short Essay (15 minutes)
            </h2>
            <p className="text-slate-700 mb-6">
              Answer <strong>one</strong> of the following in 1–2 well-organized paragraphs:
            </p>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">1. Musical Evolution</h4>
                <p className="text-blue-800">
                  Trace how one early form (ring shout, field holler, or spiritual) influenced later styles (blues, jazz, swing).
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">2. Technology's Impact</h4>
                <p className="text-green-800">
                  Explain how technology (sheet music, race records, radio) shaped the spread of African American music between 1890 and 1940.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">3. Sacred vs. Secular Comparison</h4>
                <p className="text-purple-800">
                  Compare sacred and secular functions of two genres we studied.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Grading Rubric */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Users className="h-6 w-6 text-slate-600" />
              Grading Rubric (100 points total)
            </h2>
            
            <div className="grid gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Part I: 40 pts (10 each)</h4>
                <p className="text-blue-800 text-sm">Short identifications with time period, musical features, and cultural role.</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Part II: 30 pts (15 each)</h4>
                <p className="text-green-800 text-sm">Listening analysis with genre identification, musical features, and historical context.</p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">Part III: 30 pts</h4>
                <p className="text-orange-800 text-sm">Short essay demonstrating understanding of musical evolution, technology's impact, or genre comparison.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Submission Instructions */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Submission Instructions</h2>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Write your answers in blue or black ink.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Essays should be 3–4 pages, double-spaced.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                Turn in your exam at the end of class.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Academic Integrity */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-900 mb-4">Academic Integrity</h2>
                <p className="text-red-800 leading-relaxed">
                  This exam is an <strong>individual assessment.</strong> Outside assistance (including AI tools) is not permitted. 
                  Evidence of outside authorship will result in zero credit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <div className="mt-12 text-center">
          <Link 
            to="/classes/mus240" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors bg-white rounded-lg px-6 py-3 shadow-sm border border-slate-200 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Course Home
          </Link>
        </div>
      </div>
    </div>
  );
}