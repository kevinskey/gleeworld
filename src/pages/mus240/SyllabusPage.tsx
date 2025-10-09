import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, BookOpen, Calendar, Award, Users, CheckCircle2, FileText } from 'lucide-react';
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
                <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
                <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">Syllabus</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                Survey of African American Music
              </h1>
              <h2 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl text-white/80 mb-6">MUS 240 – Fall 2025</h2>
              
              {/* Course Info Card */}
              <Card className="bg-white/95 backdrop-blur-sm border border-white/30 max-w-4xl mx-auto">
                <CardContent className="px-6 py-4 sm:px-4 sm:py-3 lg:px-8 lg:py-5 xl:px-10 xl:py-6">
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
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-amber-600" />
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

            {/* Collapsible Sections */}
            <Accordion type="multiple" className="space-y-4">
              {/* Learning Objectives */}
              <AccordionItem value="learning-objectives">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <CheckCircle2 className="h-5 w-5 text-amber-600" />
                      Learning Objectives
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
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
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Course Materials */}
              <AccordionItem value="course-materials">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <BookOpen className="h-5 w-5 text-amber-600" />
                      Course Materials
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <p className="text-gray-700">
                        Burnim, Mellonee V., and Portia K. Maultsby, eds. <em>African American Music: An Introduction</em>. 
                        New York: Routledge, 2006. Print.
                      </p>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Assignments & Activities */}
              <AccordionItem value="assignments">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <Calendar className="h-5 w-5 text-amber-600" />
                      Assignments & Activities
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* Listening Journals */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Listening Journals (10 × 10 pts each)</h4>
                        <div className="space-y-4 text-sm text-gray-700">
                          <p>Weekly 250–300 word essays connecting listening examples to cultural context.</p>
                          
                          <div className="mt-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Grading Rubric (10 Points Total):</h5>
                            <div className="bg-white/70 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium">Content Understanding:</span>
                                <span className="text-amber-600 font-semibold">4 pts</span>
                              </div>
                              <p className="text-xs text-gray-600 ml-4">Demonstrates clear understanding of musical concepts and context</p>
                              
                              <div className="flex justify-between">
                                <span className="font-medium">Critical Analysis:</span>
                                <span className="text-amber-600 font-semibold">3 pts</span>
                              </div>
                              <p className="text-xs text-gray-600 ml-4">Provides thoughtful analysis and personal reflection on the material</p>
                              
                              <div className="flex justify-between">
                                <span className="font-medium">Writing Quality:</span>
                                <span className="text-amber-600 font-semibold">2 pts</span>
                              </div>
                              <p className="text-xs text-gray-600 ml-4">Clear, well-organized writing with proper grammar and structure</p>
                              
                              <div className="flex justify-between">
                                <span className="font-medium">Requirements Met:</span>
                                <span className="text-amber-600 font-semibold">1 pt</span>
                              </div>
                              <p className="text-xs text-gray-600 ml-4">Meets word count (250-300 words) and assignment requirements</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Research Project */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Research Project (150 pts)</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p>Proposal, annotated bibliography, and final online presentation.</p>
                        </div>
                      </div>

                      {/* AI Group Project */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">AI Group Project (100 pts)</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p>Collaborative exploration of AI and African American music in six teams.</p>
                          <p>Weekly updates (Wed) + deep dive sessions (Fri).</p>
                          <p>Deliverables: research, media/creative work, merch prototypes, and contributions to GleeWorld.org.</p>
                          <p>Final Showcase in Week 15.</p>
                          <p>Rubrics included in Appendix.</p>
                        </div>
                      </div>

                      {/* Midterm Exam */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Midterm Exam (100 pts)</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p>Listening identification + essays on styles and cultural context.</p>
                        </div>
                      </div>

                      {/* Final Reflection Essay */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Final Reflection Essay (50 pts)</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p>4–5 page synthesis essay on themes and personal insights.</p>
                        </div>
                      </div>

                      {/* Participation, Discussion & Attendance */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-white/50">
                        <h4 className="text-lg font-semibold mb-3 text-gray-900">Participation, Discussion & Attendance (50 pts)</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p>Active engagement, consistent attendance, and preparation.</p>
                        </div>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Grading Policies */}
              <AccordionItem value="grading">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <Award className="h-5 w-5 text-amber-600" />
                      Grading Policies
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
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
                              <td className="border border-gray-300 p-3">100</td>
                              <td className="border border-gray-300 p-3">18%</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="border border-gray-300 p-3">Research Project</td>
                              <td className="border border-gray-300 p-3">150</td>
                              <td className="border border-gray-300 p-3">27%</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-3">AI Group Project</td>
                              <td className="border border-gray-300 p-3">100</td>
                              <td className="border border-gray-300 p-3">18%</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="border border-gray-300 p-3">Midterm Exam</td>
                              <td className="border border-gray-300 p-3">100</td>
                              <td className="border border-gray-300 p-3">18%</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-3">Final Reflection Essay</td>
                              <td className="border border-gray-300 p-3">50</td>
                              <td className="border border-gray-300 p-3">9%</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="border border-gray-300 p-3">Participation, Discussion & Attendance</td>
                              <td className="border border-gray-300 p-3">50</td>
                              <td className="border border-gray-300 p-3">9%</td>
                            </tr>
                            <tr className="bg-amber-100 font-semibold">
                              <td className="border border-gray-300 p-3">Total</td>
                              <td className="border border-gray-300 p-3">550</td>
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
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Course Schedule */}
              <AccordionItem value="schedule">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <Calendar className="h-5 w-5 text-amber-600" />
                      Course Schedule (16 Weeks, MWF)
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 1</span>
                          <div>
                            <div className="text-gray-900 font-medium">Introduction to African American Musical Traditions</div>
                            <div className="text-sm text-gray-600">August 25</div>
                            <div className="text-sm text-gray-700 mt-1">Overview of themes: survival, innovation, community. Sound as resistance and identity.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 2</span>
                          <div>
                            <div className="text-gray-900 font-medium">Spirituals and Vocal Traditions</div>
                            <div className="text-sm text-gray-600">September 1</div>
                            <div className="text-sm text-gray-700 mt-1">The music of enslavement and early freedom. Call-and-response, coded messages, and the sacred-secular bridge.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 3</span>
                          <div>
                            <div className="text-gray-900 font-medium">Blues: Foundation of American Popular Music</div>
                            <div className="text-sm text-gray-600">September 8</div>
                            <div className="text-sm text-gray-700 mt-1">Origins in the rural South. The 12-bar form, field hollers, and emotional truth.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 4</span>
                          <div>
                            <div className="text-gray-900 font-medium">Ragtime</div>
                            <div className="text-sm text-gray-600">September 15</div>
                            <div className="text-sm text-gray-700 mt-1">Scott Joplin and syncopation as sophistication. Early Black composers and the evolution of notation.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 5</span>
                          <div>
                            <div className="text-gray-900 font-medium">Jazz Origins and Early Development</div>
                            <div className="text-sm text-gray-600">September 22</div>
                            <div className="text-sm text-gray-700 mt-1">From New Orleans to Harlem. The emergence of improvisation, swing, and ensemble conversation.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 6</span>
                          <div>
                            <div className="text-gray-900 font-medium">Jubilee Quartets</div>
                            <div className="text-sm text-gray-600">September 29</div>
                            <div className="text-sm text-gray-700 mt-1">From Fisk to the Golden Gate Quartet. Vocal harmony as community statement and spiritual expression.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 7</span>
                          <div>
                            <div className="text-gray-900 font-medium">1939–1969: From Spirituals to Swing to King</div>
                            <div className="text-sm text-gray-600">October 6</div>
                            <div className="text-sm text-gray-700 mt-1">The evolution from sacred song to social anthem. Carnegie Hall's "Spirituals to Swing," Civil Rights music, and the Harlem Cultural Festival (Summer of Soul).</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 8</span>
                          <div>
                            <div className="text-gray-900 font-medium">1970s: James Brown, Funk, Disco, and Detroit Techno</div>
                            <div className="text-sm text-gray-600">October 13</div>
                            <div className="text-sm text-gray-700 mt-1">Groove as power; rhythm as protest. Funk, Afrofuturism, and the rise of Black electronic sound.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 9</span>
                          <div>
                            <div className="text-gray-900 font-medium">Hip-Hop Culture and Rap Music</div>
                            <div className="text-sm text-gray-600">October 20</div>
                            <div className="text-sm text-gray-700 mt-1">From the Bronx to the world. The DJ, the MC, and the politics of the street.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 10</span>
                          <div>
                            <div className="text-gray-900 font-medium">Contemporary R&B and Neo-Soul</div>
                            <div className="text-sm text-gray-600">October 27</div>
                            <div className="text-sm text-gray-700 mt-1">The soul revival and the return of live musicianship. Lauryn Hill, D'Angelo, Erykah Badu, and the 1990s renaissance.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 11</span>
                          <div>
                            <div className="text-gray-900 font-medium">Gospel's Modern Evolution</div>
                            <div className="text-sm text-gray-600">November 3</div>
                            <div className="text-sm text-gray-700 mt-1">From traditional quartet to praise and worship. Kirk Franklin, Yolanda Adams, and the fusion of sacred and pop idioms.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 12</span>
                          <div>
                            <div className="text-gray-900 font-medium">Jazz Fusion and Modern Jazz</div>
                            <div className="text-sm text-gray-600">November 10</div>
                            <div className="text-sm text-gray-700 mt-1">Miles Davis and Herbie Hancock's electric turn. Hip-hop jazz, Robert Glasper, Kamasi Washington.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 13</span>
                          <div>
                            <div className="text-gray-900 font-medium">Hip-Hop II: Contemporary Directions</div>
                            <div className="text-sm text-gray-600">November 17</div>
                            <div className="text-sm text-gray-700 mt-1">Trap, drill, and conscious rap. Kendrick Lamar, J. Cole, Megan Thee Stallion, and global hip-hop identity.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 14</span>
                          <div>
                            <div className="text-gray-900 font-medium">AI Workday</div>
                            <div className="text-sm text-gray-600">November 24 (Monday)</div>
                            <div className="text-sm text-gray-700 mt-1">Workshop on AI-assisted music creation. Exploration of authorship, ethics, and innovation.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                          <span className="font-semibold min-w-24 text-amber-800">Week 15</span>
                          <div>
                            <div className="text-gray-900 font-medium">Group AI Presentations</div>
                            <div className="text-sm text-gray-600">December 1</div>
                            <div className="text-sm text-gray-700 mt-1">"From Spirituals to Swing to King to Code": student projects connecting history to the digital present.</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="font-semibold min-w-24 text-amber-800">Week 16</span>
                          <div>
                            <div className="text-gray-900 font-medium">Final Exam & Reflection</div>
                            <div className="text-sm text-gray-600">December 8</div>
                            <div className="text-sm text-gray-700 mt-1">Comprehensive review. Discussion: The enduring soul of African American music in a technological age.</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Academic Policies */}
              <AccordionItem value="policies">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <Users className="h-5 w-5 text-amber-600" />
                      Academic Policies
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Attendance Policy</h4>
                        <p className="text-gray-700 text-sm">Regular attendance is essential. Students are allowed 2 unexcused absences. Additional absences may result in grade reduction.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Late Work Policy</h4>
                        <p className="text-gray-700 text-sm">Late assignments will be penalized 5% per day unless prior arrangements are made.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Academic Integrity</h4>
                        <p className="text-gray-700 text-sm">All work must be original. Plagiarism will result in failure of the assignment and may result in failure of the course.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Accessibility</h4>
                        <p className="text-gray-700 text-sm">Students requiring accommodations should contact the Office of Disability Services and provide documentation to the instructor.</p>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Appendix: Rubrics */}
              <AccordionItem value="rubrics">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-left">
                      <FileText className="h-5 w-5 text-amber-600" />
                      Appendix: Grading Rubrics
                    </CardTitle>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* AI Group Project Rubric */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">AI Group Project Rubric (100 points)</h4>
                        
                        <div className="space-y-4">
                          {/* Weekly Updates */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Weekly Updates (20 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Consistent weekly progress reports every Wednesday (10 pts)</li>
                              <li>• Quality and depth of updates (5 pts)</li>
                              <li>• Team collaboration evidence (5 pts)</li>
                            </ul>
                          </div>

                          {/* Deep Dive Sessions */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Deep Dive Sessions (15 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Active participation in Friday sessions (8 pts)</li>
                              <li>• Quality of questions and discussions (4 pts)</li>
                              <li>• Peer feedback and collaboration (3 pts)</li>
                            </ul>
                          </div>

                          {/* Research Component */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Research Component (25 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Depth and quality of research (10 pts)</li>
                              <li>• Use of credible sources (5 pts)</li>
                              <li>• Analysis and critical thinking (5 pts)</li>
                              <li>• Connection to African American music (5 pts)</li>
                            </ul>
                          </div>

                          {/* Creative/Media Work */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Creative/Media Work (15 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Originality and creativity (6 pts)</li>
                              <li>• Technical quality (5 pts)</li>
                              <li>• Relevance to project theme (4 pts)</li>
                            </ul>
                          </div>

                          {/* Merchandise Prototype */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Merchandise Prototype (10 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Design quality and innovation (5 pts)</li>
                              <li>• Market viability (3 pts)</li>
                              <li>• Connection to project theme (2 pts)</li>
                            </ul>
                          </div>

                          {/* GleeWorld.org Contribution */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">GleeWorld.org Contribution (10 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Quality of content contribution (5 pts)</li>
                              <li>• Integration with existing platform (3 pts)</li>
                              <li>• Educational value (2 pts)</li>
                            </ul>
                          </div>

                          {/* Final Showcase */}
                          <div className="border border-gray-200 rounded-lg p-4 bg-amber-50">
                            <h5 className="font-semibold text-gray-900 mb-2">Final Showcase Presentation (5 points)</h5>
                            <ul className="space-y-1 text-sm text-gray-700">
                              <li>• Clarity and organization of presentation (2 pts)</li>
                              <li>• Engagement and delivery (2 pts)</li>
                              <li>• Time management (1 pt)</li>
                            </ul>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <strong>Note:</strong> Each team member will also complete a peer evaluation, which may adjust individual grades by ±10% based on contribution level.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
}