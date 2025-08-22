import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function Syllabus() {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <main className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Survey of African American Music</h1>
          <h2 className="text-2xl text-muted-foreground mb-4">MUS 240 – Fall 2025</h2>
          
          <div className="bg-muted/50 rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Instructor:</strong> Dr. Kevin Johnson</p>
                <p><strong>Office:</strong> Rock Fine Arts Bldg. 109</p>
                <p><strong>Office Hours:</strong> MW 4–5pm or by appointment</p>
              </div>
              <div>
                <p><strong>Phone:</strong> 470-622-1392</p>
                <p><strong>Email:</strong> kjohns10@spelman.edu</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Course Description</h3>
          <p className="text-muted-foreground leading-relaxed">
            This course is designed as a historical survey of selected styles of African American Music in the United 
            States. Certain features of West African music will be identified and traced as they are retained in 
            different styles of African American music. Emphasis will be placed on stylistic characteristics, 
            performers, and social influences of each style. No prerequisites. Satisfies Fine Arts course requirement.
          </p>
        </section>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Learning Objectives</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Analyze and communicate connections between music, history, and culture through discussion, oral presentation, and written responses.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Explain and contextualize the emergence of styles and aesthetic ideals in relation to historical and cultural developments within the African American community.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Identify and distinguish musical styles and genres through a prescribed listening regimen.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Conduct research on a topic within the scope of the course and present findings in an innovative online format using appropriate academic conventions.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Compose written analyses and commentaries on African American music, addressing its impact on creators, audiences, and markets.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Apply technology effectively to communicate musical and cultural ideas on digital platforms.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">•</span>
              <span>Articulate informed perspectives on the African American creative enterprise as exemplified through music and related cultural practices.</span>
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Course Materials</h3>
          <p className="text-muted-foreground">
            Burnim, Mellonee V., and Portia K. Maultsby, eds. <em>African American Music: An Introduction</em>. 
            New York: Routledge, 2006. Print.
          </p>
        </section>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Assignments & Activities</h3>
          
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Listening Journals (10 × 20 pts each)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Strengthen listening skills and connect musical features with historical and cultural contexts.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Instructions:</strong> Write a 250–300 word entry each week on assigned works, identifying genre, style traits, and cultural significance. Use correct musical terminology. Submit via Canvas.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Format:</strong> Typed, double-spaced, PDF or Word.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Accuracy, depth of analysis, correct terminology, completion
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Reflection Papers (3 × 50 pts each)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Demonstrate critical thinking about music in its cultural context.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Instructions:</strong> Three essays (2–3 pages). Each must present a clear thesis, evidence from assigned readings or listening, and connections to historical/cultural issues.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Format:</strong> MLA or Chicago style, double-spaced, submitted via Canvas.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Thesis clarity, historical/cultural connection, analysis, organization, mechanics.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Midterm Exam (100 pts)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Assess understanding of music styles, genres, and cultural contexts (Weeks 1–8).
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Instructions:</strong> Part 1—Listening Identification. Part 2—Short Essays on genres, performers, and cultural significance. Completed in class.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Identification accuracy, strength of explanations, terminology, historical/cultural integration.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Research Project (150 pts total)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Conduct in-depth study of a topic in African American music and present findings in a professional online format.
              </p>
              <div className="text-sm text-muted-foreground mb-3">
                <strong>Components:</strong>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Proposal (20 pts): One-paragraph topic description (Week 6).</li>
                  <li>• Annotated Bibliography (30 pts): At least 5 credible sources with annotations (Week 10).</li>
                  <li>• Final Presentation (100 pts): Digital project (video, website, podcast, or interactive format) presented in class (Week 15).</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Content accuracy, depth of research, integration of context, organization, creativity, delivery.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Final Reflection Essay (50 pts)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Synthesize semester's learning and connect to personal perspective.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Instructions:</strong> Write a 4–5-page essay reflecting on course themes, personal insights, and the role of music as cultural force. Draw on examples from at least three styles studied.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Format:</strong> MLA or Chicago style, double-spaced, submitted via Canvas.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Integration of themes, depth of reflection, clarity, use of examples.
              </p>
            </div>

            <div className="border rounded-lg p-6">
              <h4 className="text-xl font-medium mb-3">Participation & Discussion (75 pts total)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> Build a collaborative classroom and strengthen communication skills.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Instructions:</strong> Attend class prepared, contribute regularly and respectfully, complete assigned readings/listening, and participate in peer feedback.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Evaluation:</strong> Preparation, contribution, engagement, respect for peers.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Grading Policies</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border p-3 text-left">Category</th>
                  <th className="border border-border p-3 text-left">Points</th>
                  <th className="border border-border p-3 text-left">Percentage</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="border border-border p-3">Listening Journals</td>
                  <td className="border border-border p-3">200</td>
                  <td className="border border-border p-3">30%</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Reflection Papers</td>
                  <td className="border border-border p-3">150</td>
                  <td className="border border-border p-3">23%</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Research Project</td>
                  <td className="border border-border p-3">150</td>
                  <td className="border border-border p-3">23%</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Midterm Exam</td>
                  <td className="border border-border p-3">100</td>
                  <td className="border border-border p-3">15%</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Final Reflection</td>
                  <td className="border border-border p-3">50</td>
                  <td className="border border-border p-3">8%</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Participation/Discussion</td>
                  <td className="border border-border p-3">75</td>
                  <td className="border border-border p-3">11%</td>
                </tr>
                <tr className="bg-muted/50 font-medium">
                  <td className="border border-border p-3">Total</td>
                  <td className="border border-border p-3">650</td>
                  <td className="border border-border p-3">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-medium mb-3">Grading Scale</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
        </section>

        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Course Schedule (16 Weeks, MWF)</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 1–2:</span>
              <span>West African foundations, Spirituals, Early Blues → Journals #1–2</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 3–4:</span>
              <span>Ragtime, Harlem Renaissance, Jazz → Reflection Paper #1, Journals #3–4</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 5–6:</span>
              <span>Swing, Gospel, WWII → Research Proposal, Journal #5</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 7–8:</span>
              <span>Civil Rights Era, Motown, Freedom Songs → Midterm, Reflection Paper #2, Journal #6</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 9–10:</span>
              <span>Funk, Soul, Black Power Era → Bibliography due, Journals #7–8</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 11–12:</span>
              <span>Hip-Hop Origins → Reflection Paper #3, Journal #9</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Weeks 13–14:</span>
              <span>Contemporary Music & Technology → Journal #10, Draft presentations</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Week 15:</span>
              <span>Student Research Presentations</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium min-w-24">Week 16:</span>
              <span>Final Reflection Essay</span>
            </div>
          </div>
        </section>
      </main>
    </UniversalLayout>
  );
}