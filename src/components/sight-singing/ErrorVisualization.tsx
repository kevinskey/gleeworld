import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradingResults } from './hooks/useGrading';
import { CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown, Music } from 'lucide-react';

interface ErrorVisualizationProps {
  results: GradingResults;
}

export const ErrorVisualization: React.FC<ErrorVisualizationProps> = ({ results }) => {
  if (!results.perNote || results.perNote.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No detailed analysis available</p>
        </CardContent>
      </Card>
    );
  }

  // Categorize notes by performance quality
  const excellentNotes = results.perNote.filter(note => 
    Math.abs(note.pitchErrCents) <= 25 && Math.abs(note.onsetErrMs) <= 50 && Math.abs(note.durErrPct) <= 10
  );
  
  const goodNotes = results.perNote.filter(note => 
    Math.abs(note.pitchErrCents) <= 50 && Math.abs(note.onsetErrMs) <= 100 && Math.abs(note.durErrPct) <= 25 &&
    !excellentNotes.includes(note)
  );
  
  const problematicNotes = results.perNote.filter(note => 
    !excellentNotes.includes(note) && !goodNotes.includes(note)
  );

  // Find most common issues
  const pitchIssues = results.perNote.filter(note => Math.abs(note.pitchErrCents) > 50);
  const timingIssues = results.perNote.filter(note => Math.abs(note.onsetErrMs) > 100);
  const durationIssues = results.perNote.filter(note => Math.abs(note.durErrPct) > 25);

  // Generate actionable feedback
  const generateFeedback = () => {
    const feedback = [];
    
    if (pitchIssues.length > results.perNote.length * 0.3) {
      const sharpNotes = pitchIssues.filter(note => note.pitchErrCents > 50);
      const flatNotes = pitchIssues.filter(note => note.pitchErrCents < -50);
      
      if (sharpNotes.length > flatNotes.length) {
        feedback.push({
          type: 'pitch',
          icon: TrendingUp,
          title: 'Pitch Tendency: Too Sharp',
          description: `${sharpNotes.length} notes were sung too high. Try relaxing your jaw and throat, and listen more carefully to the reference pitch.`,
          color: 'text-primary'
        });
      } else if (flatNotes.length > sharpNotes.length) {
        feedback.push({
          type: 'pitch',
          icon: TrendingDown,
          title: 'Pitch Tendency: Too Flat',
          description: `${flatNotes.length} notes were sung too low. Try better breath support and more focused listening to the target pitch.`,
          color: 'text-accent'
        });
      } else {
        feedback.push({
          type: 'pitch',
          icon: Music,
          title: 'Pitch Inconsistency',
          description: 'Your pitch varies between sharp and flat. Focus on steady breath support and careful listening.',
          color: 'text-muted-foreground'
        });
      }
    }
    
    if (timingIssues.length > results.perNote.length * 0.3) {
      const lateNotes = timingIssues.filter(note => note.onsetErrMs > 100);
      const earlyNotes = timingIssues.filter(note => note.onsetErrMs < -100);
      
      if (lateNotes.length > earlyNotes.length) {
        feedback.push({
          type: 'timing',
          icon: AlertCircle,
          title: 'Timing: Running Behind',
          description: `${lateNotes.length} notes were late. Practice with a metronome and focus on anticipating each note's entrance.`,
          color: 'text-destructive'
        });
      } else if (earlyNotes.length > lateNotes.length) {
        feedback.push({
          type: 'timing',
          icon: AlertCircle,
          title: 'Timing: Rushing Ahead',
          description: `${earlyNotes.length} notes were early. Slow down and count carefully, making sure to hold notes for their full value.`,
          color: 'text-primary'
        });
      }
    }
    
    if (durationIssues.length > results.perNote.length * 0.3) {
      feedback.push({
        type: 'duration',
        icon: Music,
        title: 'Note Length Issues',
        description: `${durationIssues.length} notes were held too long or too short. Practice counting while singing to maintain steady note values.`,
        color: 'text-accent'
      });
    }
    
    return feedback;
  };

  const feedback = generateFeedback();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Music className="h-4 w-4" />
          Performance Analysis & Practice Tips
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Here's how you performed on each note, plus actionable advice for improvement.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Excellent</span>
            </div>
            <div className="text-lg font-bold text-accent">{excellentNotes.length}</div>
            <div className="text-xs text-muted-foreground">notes sung well</div>
          </div>
          
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Good</span>
            </div>
            <div className="text-lg font-bold text-primary">{goodNotes.length}</div>
            <div className="text-xs text-muted-foreground">minor issues</div>
          </div>
          
          <div className="text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-foreground">Needs Work</span>
            </div>
            <div className="text-lg font-bold text-destructive">{problematicNotes.length}</div>
            <div className="text-xs text-muted-foreground">notes to practice</div>
          </div>
        </div>

        {/* Actionable Feedback */}
        {feedback.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">What to Work On:</h4>
            <div className="space-y-3">
              {feedback.map((item, index) => (
                <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                  <div>
                    <h5 className="text-sm font-medium mb-1">{item.title}</h5>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note-by-Note Details */}
        <div>
          <h4 className="text-sm font-medium mb-3">Note Details:</h4>
          <div className="grid gap-2">
            {results.perNote.map((note, index) => {
              const isExcellent = excellentNotes.includes(note);
              const isGood = goodNotes.includes(note);
              const isProblematic = problematicNotes.includes(note);
              
              let statusIcon = CheckCircle;
              let statusColor = 'text-accent';
              let bgColor = 'bg-accent/10 border-accent/20';
              
              if (isGood) {
                statusIcon = AlertCircle;
                statusColor = 'text-primary';
                bgColor = 'bg-primary/10 border-primary/20';
              } else if (isProblematic) {
                statusIcon = XCircle;
                statusColor = 'text-destructive';
                bgColor = 'bg-destructive/10 border-destructive/20';
              }
              
              const StatusIcon = statusIcon;
              
              return (
                <div key={index} className={`p-3 rounded border ${bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                      <span className="text-sm font-medium">Note {index + 1}</span>
                    </div>
                    {note.ok && <Badge variant="outline" className="text-xs">✓ Acceptable</Badge>}
                  </div>
                  
                  {isProblematic && (
                    <div className="text-xs space-y-1">
                      {Math.abs(note.pitchErrCents) > 50 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Pitch:</span>
                           <span className={note.pitchErrCents > 0 ? 'text-primary' : 'text-accent'}>
                             {note.pitchErrCents > 0 ? `${note.pitchErrCents.toFixed(0)}¢ too sharp` : `${Math.abs(note.pitchErrCents).toFixed(0)}¢ too flat`}
                           </span>
                        </div>
                      )}
                      {Math.abs(note.onsetErrMs) > 100 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Timing:</span>
                           <span className={note.onsetErrMs > 0 ? 'text-destructive' : 'text-primary'}>
                             {note.onsetErrMs > 0 ? `${note.onsetErrMs.toFixed(0)}ms late` : `${Math.abs(note.onsetErrMs).toFixed(0)}ms early`}
                           </span>
                        </div>
                      )}
                      {Math.abs(note.durErrPct) > 25 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Duration:</span>
                           <span className={note.durErrPct > 0 ? 'text-accent' : 'text-muted-foreground'}>
                             {note.durErrPct > 0 ? `${note.durErrPct.toFixed(0)}% too long` : `${Math.abs(note.durErrPct).toFixed(0)}% too short`}
                           </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Practice Tips */}
        <div className="pt-2 border-t">
          <h5 className="text-sm font-medium mb-2">General Practice Tips:</h5>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>• <strong>Pitch accuracy:</strong> Practice with a piano to reinforce correct pitches</div>
            <div>• <strong>Rhythm:</strong> Use a metronome and count aloud while practicing</div>
            <div>• <strong>Overall:</strong> Start slowly and gradually increase tempo as accuracy improves</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};