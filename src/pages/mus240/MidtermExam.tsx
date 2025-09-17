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
            MUS 240 – Midterm Exam (1840–1940)
          </h1>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="secondary" className="px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              Closed-Book Exam
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
                    <p className="text-amber-700 text-sm">
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

        {/* Part I: Short Answer */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">I</span>
              Part I. Short Answer (20 points)
            </h2>
            <p className="text-slate-700 mb-6">
              Answer <strong>four (4)</strong> of the following in 3–5 sentences (5 points each):
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800">
                  <span className="font-semibold">1.</span> Explain how the <strong>ring shout</strong> reflects African cultural survivals. Use an example from our listening.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800">
                  <span className="font-semibold">2.</span> What role did the <strong>Black church</strong> play in sustaining sacred and secular traditions between 1865–1900?
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800">
                  <span className="font-semibold">3.</span> Compare a <strong>blues lyric</strong> and a <strong>spiritual text</strong> in terms of theme and function. Provide examples.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800">
                  <span className="font-semibold">4.</span> How did <strong>migration</strong> reshape African American music in the early 20th century?
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-800">
                  <span className="font-semibold">5.</span> Why was the <strong>1939 "Spirituals to Swing" concert</strong> historically significant?
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Part II: Source Analysis */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">II</span>
              Part II. Source Analysis (30 points)
            </h2>
            <p className="text-slate-700 mb-6">
              You will be given two excerpts in class:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Excerpt A:</h4>
                <p className="text-blue-800">Lyrics from a spiritual studied in class.</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Excerpt B:</h4>
                <p className="text-purple-800">A stanza from a blues song (e.g., <em>St. Louis Blues</em>).</p>
              </div>
            </div>

            <div className="bg-slate-100 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 mb-3">For each excerpt (15 pts each):</h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Identify the genre.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Explain how the text reflects African American experience.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Discuss one musical feature (rhythm, form, style).
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full mt-2"></span>
                  Connect to a broader historical moment (slavery, Reconstruction, migration, Depression).
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Part III: Essay */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">III</span>
              Part III. Essay (50 points)
            </h2>
            <p className="text-slate-700 mb-6">
              Write a 3–4 page essay on <strong>one (1)</strong> of the following:
            </p>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">1. Sacred vs. Secular</h4>
                <p className="text-blue-800">
                  Discuss the tension and overlap between sacred and secular traditions from 1840–1940. 
                  Use examples of spirituals, blues, gospel beginnings, and quartets.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">2. The American Negro, 1840–1940</h4>
                <p className="text-green-800">
                  Trace the journey from slavery through Reconstruction to swing. How did music preserve 
                  identity and innovate toward new futures?
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">3. Quartet Case Study</h4>
                <p className="text-purple-800">
                  Explain how groups like the Golden Gate Quartet or Mills Brothers navigated sacred 
                  and secular spaces.
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
                <h4 className="font-semibold text-blue-900 mb-2">Short Answer (20 pts)</h4>
                <p className="text-blue-800 text-sm">Accuracy, concision, connection to class.</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Source Analysis (30 pts)</h4>
                <p className="text-green-800 text-sm">Correct identification, context, musical detail.</p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-3">Essay (50 pts)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 text-sm">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-orange-800">Thesis clarity</div>
                    <div className="text-orange-600">(10)</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-orange-800">Historical context</div>
                    <div className="text-orange-600">(10)</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-orange-800">Musical literacy</div>
                    <div className="text-orange-600">(10)</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-orange-800">Class examples</div>
                    <div className="text-orange-600">(10)</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-orange-800">Organization</div>
                    <div className="text-orange-600">(10)</div>
                  </div>
                </div>
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