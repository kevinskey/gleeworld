import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bot, Sparkles, Play, RotateCcw, Eye, Clock, Target, Award } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_JOURNALS = [
  {
    id: '1',
    title: 'Excellent Response Example',
    content: `This listening journal focuses on Miles Davis's "Kind of Blue" album, specifically the track "So What." The modal jazz approach Davis employed represents a revolutionary departure from bebop's complex chord progressions. The track opens with Bill Evans's impressionistic piano introduction, establishing the D Dorian mode that defines the composition's harmonic framework.

The bass line, performed by Paul Chambers, provides a walking foundation that perfectly complements the modal structure. Davis's trumpet entrance demonstrates his mastery of space and silence - notice how he allows each note to breathe and resonate. His use of the Harmon mute creates an intimate, almost conversational tone that became his signature sound.

The interplay between Davis and John Coltrane during their respective solos showcases the collaborative nature of modal jazz. Coltrane's tenor saxophone explores the mode with increasing intensity, building layers of complexity while remaining within the established harmonic parameters. This approach allowed for greater freedom of expression while maintaining structural coherence.

Historically, "Kind of Blue" emerged during a pivotal moment in African American music, representing both artistic innovation and cultural expression during the Civil Rights era. The album's success helped establish jazz as America's classical music while providing a platform for African American artistic voice.`,
    expectedGrade: 'A (95%)',
    expectedFeedback: 'Excellent analysis demonstrating deep understanding of modal jazz principles and historical context.'
  },
  {
    id: '2', 
    title: 'Average Response Example',
    content: `I listened to "So What" by Miles Davis and thought it was pretty good. The trumpet sounded nice and the bass was walking around. The song didn't have many chord changes which made it different from other jazz I've heard.

Miles Davis plays the trumpet and there's also saxophone. The piano at the beginning was quiet and peaceful. I could hear the drums keeping steady time throughout the piece.

The music made me think about the 1950s and how jazz was popular then. It's different from bebop because it's more relaxed and doesn't change chords as much. The musicians took turns playing solos which is typical for jazz music.

Overall I enjoyed listening to this track and it helped me understand modal jazz better.`,
    expectedGrade: 'C+ (78%)',
    expectedFeedback: 'Good basic observations but needs deeper analysis of musical elements and historical significance.'
  },
  {
    id: '3',
    title: 'Poor Response Example',
    content: `This song was okay. The trumpet was loud and the bass was there too. It sounded like jazz music. Miles Davis is famous for jazz. The song was long and had solos. I don't know much about jazz but this seemed typical. It was recorded a long time ago.`,
    expectedGrade: 'D (65%)',
    expectedFeedback: 'Response lacks depth, analysis, and demonstrates limited understanding of the material.'
  }
];

export const AIGradingDemo = () => {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_JOURNALS[0]);
  const [customJournal, setCustomJournal] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'samples' | 'custom'>('samples');

  const simulateAIGrading = async (content: string, isFromSample = false) => {
    setIsGrading(true);
    setDemoResult(null);

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Mock AI grading results based on content quality
    const wordCount = content.split(' ').length;
    const hasGoodAnalysis = content.toLowerCase().includes('modal') || 
                           content.toLowerCase().includes('analysis') ||
                           content.toLowerCase().includes('harmony');
    const hasHistoricalContext = content.toLowerCase().includes('historical') ||
                                content.toLowerCase().includes('civil rights') ||
                                content.toLowerCase().includes('african american');

    const mockResult = {
      overall_score: isFromSample ? 
        (selectedSample.expectedGrade.includes('A') ? 95 : 
         selectedSample.expectedGrade.includes('C') ? 78 : 65) :
        Math.min(95, Math.max(55, 70 + (hasGoodAnalysis ? 15 : 0) + (hasHistoricalContext ? 10 : 0))),
      letter_grade: '',
      rubric_scores: [
        {
          criterion: 'Content Understanding',
          score: hasHistoricalContext ? 5 : hasGoodAnalysis ? 4 : 3,
          max_score: 5,
          feedback: hasHistoricalContext ? 
            'Excellent understanding of historical context and musical significance' :
            hasGoodAnalysis ? 'Good grasp of musical concepts with room for deeper historical context' :
            'Basic understanding present, needs more detailed analysis'
        },
        {
          criterion: 'Musical Analysis', 
          score: hasGoodAnalysis ? 5 : content.length > 400 ? 4 : 2,
          max_score: 5,
          feedback: hasGoodAnalysis ?
            'Thorough analysis of musical elements and structure' :
            content.length > 400 ? 'Good attempt at analysis but could be more specific' :
            'Limited musical analysis - focus more on specific elements'
        },
        {
          criterion: 'Writing Quality',
          score: wordCount >= 250 && wordCount <= 350 ? 4 : wordCount >= 200 ? 3 : 2,
          max_score: 4,
          feedback: wordCount >= 250 && wordCount <= 350 ?
            'Excellent length and organization' :
            `Word count: ${wordCount}. Target range is 250-300 words`
        },
        {
          criterion: 'Critical Thinking',
          score: content.includes('represents') || content.includes('demonstrates') ? 3 : 
                content.includes('think') || content.includes('feel') ? 2 : 1,
          max_score: 3,
          feedback: 'Shows some personal reflection but could develop deeper insights'
        }
      ],
      overall_feedback: isFromSample ? selectedSample.expectedFeedback :
        'Good effort! Focus on deeper musical analysis and historical connections.',
      metadata: {
        word_count: wordCount,
        word_range_ok: wordCount >= 250 && wordCount <= 300,
        processing_time: '2.3s',
        ai_model: 'claude-3-5-sonnet-20241022'
      }
    };

    // Calculate letter grade
    if (mockResult.overall_score >= 90) mockResult.letter_grade = 'A';
    else if (mockResult.overall_score >= 80) mockResult.letter_grade = 'B';
    else if (mockResult.overall_score >= 70) mockResult.letter_grade = 'C';
    else if (mockResult.overall_score >= 60) mockResult.letter_grade = 'D';
    else mockResult.letter_grade = 'F';

    setDemoResult(mockResult);
    setIsGrading(false);
    toast.success('Demo grading completed!');
  };

  const totalPossiblePoints = demoResult?.rubric_scores?.reduce((sum: number, score: any) => sum + score.max_score, 0) || 20;
  const earnedPoints = demoResult?.rubric_scores?.reduce((sum: number, score: any) => sum + score.score, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">AI Grading Demonstration</h3>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience how our AI analyzes journal entries using comprehensive rubric criteria. 
          Try sample responses or test your own content.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex bg-muted/30 rounded-lg p-1">
          <Button
            variant={activeTab === 'samples' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('samples')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Sample Responses
          </Button>
          <Button
            variant={activeTab === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('custom')}
          >
            <Target className="h-4 w-4 mr-1" />
            Test Your Own
          </Button>
        </div>
      </div>

      {activeTab === 'samples' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_JOURNALS.map((sample) => (
              <Card 
                key={sample.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedSample.id === sample.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedSample(sample)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{sample.title}</CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {sample.expectedGrade}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {sample.content.substring(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Selected Journal: {selectedSample.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4 max-h-64 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{selectedSample.content}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedSample.content.split(' ').length} words
                </Badge>
                <Badge variant="outline">Expected: {selectedSample.expectedGrade}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Test Your Journal Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter your journal response here to see how the AI would grade it... 

Try discussing musical elements like harmony, rhythm, melody, or form. Include historical context about the piece or artist. Aim for 250-300 words with thoughtful analysis."
              value={customJournal}
              onChange={(e) => setCustomJournal(e.target.value)}
              rows={8}
              className="mb-4"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={customJournal.split(' ').length >= 250 && customJournal.split(' ').length <= 300 ? 'default' : 'secondary'}>
                  {customJournal.split(' ').filter(word => word.length > 0).length} words
                </Badge>
                {customJournal.length > 0 && (
                  <Badge variant="outline">
                    Target: 250-300 words
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => simulateAIGrading(customJournal)}
                disabled={isGrading || customJournal.trim().length < 50}
              >
                {isGrading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    AI Grading...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Grade with AI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button
          onClick={() => simulateAIGrading(activeTab === 'samples' ? selectedSample.content : customJournal, activeTab === 'samples')}
          disabled={isGrading || (activeTab === 'custom' && customJournal.trim().length < 50)}
          size="lg"
          className="min-w-48"
        >
          {isGrading ? (
            <>
              <Clock className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Bot className="h-5 w-5 mr-2" />
              Run AI Grading Demo
            </>
          )}
        </Button>
      </div>

      {demoResult && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                AI Grading Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-lg px-3 py-1">
                  {Math.round(demoResult.overall_score)}% ({demoResult.letter_grade})
                </Badge>
                <Badge variant="outline">
                  {earnedPoints}/{totalPossiblePoints} points
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Overall Feedback */}
            <div>
              <h4 className="font-medium mb-2">Overall Feedback</h4>
              <div className="bg-background p-3 rounded-lg border">
                <p className="text-sm">{demoResult.overall_feedback}</p>
              </div>
            </div>

            {/* Rubric Breakdown */}
            <div>
              <h4 className="font-medium mb-3">Rubric Breakdown</h4>
              <div className="grid gap-3">
                {demoResult.rubric_scores.map((score: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{score.criterion}</span>
                      <Badge variant="outline">
                        {score.score}/{score.max_score} pts
                      </Badge>
                    </div>
                    <Progress 
                      value={(score.score / score.max_score) * 100} 
                      className="h-2 mb-2"
                    />
                    <p className="text-xs text-muted-foreground">{score.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              <div>Word Count: {demoResult.metadata.word_count}</div>
              <div>Processing Time: {demoResult.metadata.processing_time}</div>
              <div>AI Model: {demoResult.metadata.ai_model}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};