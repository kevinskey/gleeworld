import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Calendar, Award, Users, CheckCircle2 } from 'lucide-react';
import backgroundImage from '@/assets/mus240-background.jpg';

export default function Syllabus() {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto p-6">
          {/* Header with back navigation */}
          <div className="mb-8">
            <Link 
              to="/classes/mus240" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <BookOpen className="h-6 w-6 text-amber-300" />
                <span className="text-white/90 font-medium">Syllabus</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                Survey of African American Music
              </h1>
              <h2 className="text-xl md:text-2xl text-white/80 mb-6">MUS 240 – Fall 2025</h2>
              
              {/* Course Info Card */}
              <Card className="bg-white/95 backdrop-blur-sm border border-white/30 max-w-4xl mx-auto">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong>Instructor:</strong> Dr. Kevin Johnson</p>
                      <p><strong>Office:</strong> Rock Fine Arts Bldg. 109</p>
                      <p><strong>Office Hours:</strong> MW 4–5pm or by appointment</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong>Phone:</strong> 470-622-1392</p>
                      <p><strong>Email:</strong> kjohns10@spelman.edu</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            {/* Course Description */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  Course Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  This course is designed as a historical survey of selected styles of African American Music in the United 
                  States. Certain features of West African music will be identified and traced as they are retained in 
                  different styles of African American music. Emphasis will be placed on stylistic characteristics, 
                  performers, and social influences of each style. No prerequisites. Satisfies Fine Arts course requirement.
                </p>
              </CardContent>
            </Card>

            {/* Learning Objectives */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Analyze and communicate connections between music, history, and culture through discussion, oral presentation, and written responses.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Explain and contextualize the emergence of styles and aesthetic ideals in relation to historical and cultural developments within the African American community.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Identify and distinguish musical styles and genres through a prescribed listening regimen.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Conduct research on a topic within the scope of the course and present findings in an innovative online format using appropriate academic conventions.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Compose written analyses and commentaries on African American music, addressing its impact on creators, audiences, and markets.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Apply technology effectively to communicate musical and cultural ideas on digital platforms.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">•</span>
                    <span>Articulate informed perspectives on the African American creative enterprise as exemplified through music and related cultural practices.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Course Materials */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  Course Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Burnim, Mellonee V., and Portia K. Maultsby, eds. <em>African American Music: An Introduction</em>. 
                  New York: Routledge, 2006. Print.
                </p>
              </CardContent>
            </Card>

            {/* Assignments & Activities */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  Assignments & Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Listening Journals */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Listening Journals (10 × 20 pts each)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Strengthen listening skills and connect musical features with historical and cultural contexts.</p>
                    <p><strong>Instructions:</strong> Write a 250–300 word entry each week on assigned works, identifying genre, style traits, and cultural significance. Use correct musical terminology. Submit via Canvas.</p>
                    <p><strong>Format:</strong> Typed, double-spaced, PDF or Word.</p>
                    <p><strong>Evaluation:</strong> Accuracy, depth of analysis, correct terminology, completion</p>
                  </div>
                </div>

                {/* Reflection Papers */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Reflection Papers (3 × 50 pts each)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Demonstrate critical thinking about music in its cultural context.</p>
                    <p><strong>Instructions:</strong> Three essays (2–3 pages). Each must present a clear thesis, evidence from assigned readings or listening, and connections to historical/cultural issues.</p>
                    <p><strong>Format:</strong> MLA or Chicago style, double-spaced, submitted via Canvas.</p>
                    <p><strong>Evaluation:</strong> Thesis clarity, historical/cultural connection, analysis, organization, mechanics.</p>
                  </div>
                </div>

                {/* Midterm Exam */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Midterm Exam (100 pts)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Assess understanding of music styles, genres, and cultural contexts (Weeks 1–8).</p>
                    <p><strong>Instructions:</strong> Part 1—Listening Identification. Part 2—Short Essays on genres, performers, and cultural significance. Completed in class.</p>
                    <p><strong>Evaluation:</strong> Identification accuracy, strength of explanations, terminology, historical/cultural integration.</p>
                  </div>
                </div>

                {/* Research Project */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Research Project (150 pts total)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Conduct in-depth study of a topic in African American music and present findings in a professional online format.</p>
                    <div>
                      <strong>Components:</strong>
                      <ul className="ml-4 mt-2 space-y-1">
                        <li>• Proposal (20 pts): One-paragraph topic description (Week 6).</li>
                        <li>• Annotated Bibliography (30 pts): At least 5 credible sources with annotations (Week 10).</li>
                        <li>• Final Presentation (100 pts): Digital project (video, website, podcast, or interactive format) presented in class (Week 15).</li>
                      </ul>
                    </div>
                    <p><strong>Evaluation:</strong> Content accuracy, depth of research, integration of context, organization, creativity, delivery.</p>
                  </div>
                </div>

                {/* Final Reflection Essay */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Final Reflection Essay (50 pts)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Synthesize semester's learning and connect to personal perspective.</p>
                    <p><strong>Instructions:</strong> Write a 4–5-page essay reflecting on course themes, personal insights, and the role of music as cultural force. Draw on examples from at least three styles studied.</p>
                    <p><strong>Format:</strong> MLA or Chicago style, double-spaced, submitted via Canvas.</p>
                    <p><strong>Evaluation:</strong> Integration of themes, depth of reflection, clarity, use of examples.</p>
                  </div>
                </div>

                {/* Participation & Discussion */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Participation & Discussion (75 pts total)</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p><strong>Purpose:</strong> Build a collaborative classroom and strengthen communication skills.</p>
                    <p><strong>Instructions:</strong> Attend class prepared, contribute regularly and respectfully, complete assigned readings/listening, and participate in peer feedback.</p>
                    <p><strong>Evaluation:</strong> Preparation, contribution, engagement, respect for peers.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grading Policies */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Award className="h-5 w-5 text-amber-600" />
                  Grading Policies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-amber-50">
                        <th className="border border-gray-300 p-3 text-left font-semibold">Category</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Points</th>
                        <th className="border border-gray-300 p-3 text-left font-semibold">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr>
                        <td className="border border-gray-300 p-3">Listening Journals</td>
                        <td className="border border-gray-300 p-3">200</td>
                        <td className="border border-gray-300 p-3">30%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-3">Reflection Papers</td>
                        <td className="border border-gray-300 p-3">150</td>
                        <td className="border border-gray-300 p-3">23%</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Research Project</td>
                        <td className="border border-gray-300 p-3">150</td>
                        <td className="border border-gray-300 p-3">23%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-3">Midterm Exam</td>
                        <td className="border border-gray-300 p-3">100</td>
                        <td className="border border-gray-300 p-3">15%</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-3">Final Reflection</td>
                        <td className="border border-gray-300 p-3">50</td>
                        <td className="border border-gray-300 p-3">8%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-3">Participation/Discussion</td>
                        <td className="border border-gray-300 p-3">75</td>
                        <td className="border border-gray-300 p-3">11%</td>
                      </tr>
                      <tr className="bg-amber-100 font-semibold">
                        <td className="border border-gray-300 p-3">Total</td>
                        <td className="border border-gray-300 p-3">650</td>
                        <td className="border border-gray-300 p-3">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Grading Scale</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
                    <div>A = 95–100%</div>
                    <div>A- = 90–94%</div>
                    <div>B+ = 87–89%</div>
                    <div>B = 83–86%</div>
                    <div>B- = 80–82%</div>
                    <div>C+ = 77–79%</div>
                    <div>C = 73–76%</div>
                    <div>C- = 70–72%</div>
                    <div>D+ = 65–69%</div>
                    <div>D = 60–64%</div>
                    <div>F = &lt;59%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Schedule */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  Course Schedule (16 Weeks, MWF)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 1–2:</span>
                    <span className="text-gray-700">West African foundations, Spirituals, Early Blues → Journals #1–2</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-white rounded-lg border">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 3–4:</span>
                    <span className="text-gray-700">Ragtime, Harlem Renaissance, Jazz → Reflection Paper #1, Journals #3–4</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 5–6:</span>
                    <span className="text-gray-700">Swing, Gospel, WWII → Research Proposal, Journal #5</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-white rounded-lg border">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 7–8:</span>
                    <span className="text-gray-700">Civil Rights Era, Motown, Freedom Songs → Midterm, Reflection Paper #2, Journal #6</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 9–10:</span>
                    <span className="text-gray-700">Funk, Soul, Black Power Era → Bibliography due, Journals #7–8</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-white rounded-lg border">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 11–12:</span>
                    <span className="text-gray-700">Hip-Hop Origins → Reflection Paper #3, Journal #9</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                    <span className="font-semibold min-w-24 text-amber-800">Weeks 13–14:</span>
                    <span className="text-gray-700">Contemporary Music & Technology → Journal #10, Draft presentations</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-white rounded-lg border">
                    <span className="font-semibold min-w-24 text-amber-800">Week 15:</span>
                    <span className="text-gray-700">Student Research Presentations</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                    <span className="font-semibold min-w-24 text-amber-800">Week 16:</span>
                    <span className="text-gray-700">Final Reflection Essay</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
}