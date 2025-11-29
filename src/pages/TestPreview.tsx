import { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Trophy, Edit } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTest } from '@/hooks/useTestBuilder';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';

export default function TestPreview() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTest(testId!);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isPlaying: radioPlaying, togglePlayPause } = useRadioPlayer();

  if (isLoading) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-6">
          <div>Loading...</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!data || !testId) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-6">
          <div>Test not found</div>
        </div>
      </UniversalLayout>
    );
  }

  const { test, questions, options } = data;

  const getQuestionOptions = (questionId: string) => {
    return options.filter(opt => opt.question_id === questionId);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      essay: 'Essay',
    };
    return labels[type] || type;
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard?module=test-builder" className="hover:text-foreground transition-colors">
            Test Builder
          </Link>
          <span>/</span>
          <Link to={`/test-builder/${testId}`} className="hover:text-foreground transition-colors">
            {test.title}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Preview</span>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/test-builder/${testId}`)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={test.is_published ? 'default' : 'secondary'}
              className={test.is_published ? 'shadow-sm' : 'border'}
            >
              {test.is_published ? 'Published' : 'Draft'}
            </Badge>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate(`/test-builder/${testId}`)}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Test
            </Button>
          </div>
        </div>

        {/* Test Header Card */}
        <Card className="shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl mb-2">{test.title}</CardTitle>
              {test.description && (
                <CardDescription className="text-base">{test.description}</CardDescription>
              )}
            </div>
            <div className="flex flex-wrap gap-4 pt-2 border-t">
              {test.duration_minutes && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">{test.duration_minutes}</span>
                  <span className="text-muted-foreground">minutes</span>
                </div>
              )}
              {test.passing_score && (
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Passing:</span>
                  <span className="font-medium">{test.passing_score}%</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{questions.length}</span>
                <span className="text-muted-foreground">
                  {questions.length === 1 ? 'question' : 'questions'}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const questionOptions = getQuestionOptions(question.id);
            
            return (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        {index + 1}. {question.question_text}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(question.media_url || question.youtube_video_id) && (
                    <div className="mb-4">
                      {question.media_type === 'image' && question.media_url && (
                        <img 
                          src={question.media_url} 
                          alt="Question media" 
                          className="max-w-md rounded-lg border"
                        />
                      )}
                      {question.media_type === 'audio' && question.media_url && (
                        <div className="space-y-2">
                          <audio 
                            ref={audioRef}
                            controls 
                            preload="auto"
                            className="w-full max-w-md"
                            crossOrigin="anonymous"
                            muted={false}
                            playsInline
                            onPlay={(e) => {
                              const audio = e.currentTarget;
                              audio.muted = false;
                              audio.volume = 1;
                              if (radioPlaying) {
                                console.log('Pausing radio for test audio');
                                togglePlayPause();
                              }
                            }}
                            onError={(e) => {
                              console.error('Audio loading error:', e);
                              console.error('Audio URL:', question.media_url);
                            }}
                            onLoadedData={(e) => {
                              const audio = e.currentTarget;
                              audio.muted = false;
                              audio.volume = 1;
                              console.log('Audio loaded successfully:', question.media_url);
                            }}
                            onCanPlayThrough={(e) => {
                              const audio = e.currentTarget;
                              audio.muted = false;
                              audio.volume = 1;
                              console.log('Audio can play through:', question.media_url);
                            }}
                          >
                            <source src={question.media_url} type="audio/mpeg" />
                            <source src={question.media_url} type="audio/wav" />
                            <source src={question.media_url} type="audio/ogg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      {question.media_type === 'youtube' && question.youtube_video_id && (
                        <div className="aspect-video max-w-2xl">
                          <iframe
                            className="w-full h-full rounded-lg border"
                            src={`https://www.youtube.com/embed/${question.youtube_video_id}`}
                            title="YouTube video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {question.media_type === 'video' && question.media_url && (
                        <video controls className="w-full max-w-md rounded-lg border">
                          <source src={question.media_url} />
                        </video>
                      )}
                    </div>
                  )}

                  {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
                    <div className="space-y-2">
                      {questionOptions.map((option, optIndex) => (
                        <div 
                          key={option.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            option.is_correct 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm">
                            {String.fromCharCode(65 + optIndex)}
                          </div>
                          <div className="flex-1">
                            {option.option_text}
                            {option.is_correct && (
                              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'short_answer' && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Students will provide a short text answer
                      </p>
                    </div>
                  )}

                  {question.question_type === 'essay' && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Students will provide a detailed essay response
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </UniversalLayout>
  );
}
