import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { ScoreDisplay } from './ScoreDisplay';
import { GradingResults } from './GradingResults';
import { ErrorVisualization } from './ErrorVisualization';
import { GradingResults as GradingResultsType } from './hooks/useGrading';

interface PerformanceReportProps {
  musicXML: string;
  gradingResults: GradingResultsType;
  exerciseParams?: {
    difficulty: string;
    keySignature: string;
    timeSignature: string;
    voiceRange: string;
    bpm: number;
  };
  timestamp?: Date;
}

export const PerformanceReport: React.FC<PerformanceReportProps> = ({
  musicXML,
  gradingResults,
  exerciseParams,
  timestamp = new Date()
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    // Create a comprehensive text report
    const reportContent = `
SIGHT-SINGING PERFORMANCE REPORT
Generated: ${timestamp.toLocaleString()}

EXERCISE PARAMETERS:
${exerciseParams ? `
- Difficulty: ${exerciseParams.difficulty}
- Key Signature: ${exerciseParams.keySignature}
- Time Signature: ${exerciseParams.timeSignature}
- Voice Range: ${exerciseParams.voiceRange}
- Tempo: ${exerciseParams.bpm} BPM
` : 'Exercise parameters not available'}

PERFORMANCE RESULTS:
- Overall Score: ${(gradingResults.overall * 100).toFixed(1)}% (${gradingResults.letter})
- Pitch Accuracy: ${(gradingResults.pitchAcc * 100).toFixed(1)}%
- Rhythm Accuracy: ${(gradingResults.rhythmAcc * 100).toFixed(1)}%
- Rest Accuracy: ${(gradingResults.restAcc * 100).toFixed(1)}%

NOTE-BY-NOTE ANALYSIS:
${gradingResults.perNote.map((note, i) => `
Note ${i + 1}:
  - Timing Error: ${note.onsetErrMs.toFixed(1)}ms
  - Duration Error: ${note.durErrPct.toFixed(1)}%
  - Pitch Error: ${note.pitchErrCents.toFixed(1)} cents
  - Status: ${note.ok ? 'Good' : 'Needs Improvement'}
`).join('')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sight-singing-report-${timestamp.getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Report Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl">Performance Report</CardTitle>
            <p className="text-muted-foreground mt-1">
              Generated on {timestamp.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        
        {exerciseParams && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium">Difficulty:</span>
                <p className="text-muted-foreground">{exerciseParams.difficulty}</p>
              </div>
              <div>
                <span className="font-medium">Key:</span>
                <p className="text-muted-foreground">{exerciseParams.keySignature}</p>
              </div>
              <div>
                <span className="font-medium">Time:</span>
                <p className="text-muted-foreground">{exerciseParams.timeSignature}</p>
              </div>
              <div>
                <span className="font-medium">Voice:</span>
                <p className="text-muted-foreground">{exerciseParams.voiceRange}</p>
              </div>
              <div>
                <span className="font-medium">Tempo:</span>
                <p className="text-muted-foreground">{exerciseParams.bpm} BPM</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Musical Score Section */}
      <Card>
        <CardHeader>
          <CardTitle>Musical Exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px]">
            <ScoreDisplay musicXML={musicXML} />
          </div>
        </CardContent>
      </Card>

      {/* Performance Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Results */}
        <div>
          <GradingResults results={gradingResults} />
        </div>

        {/* Detailed Error Analysis */}
        <div>
          <ErrorVisualization results={gradingResults} />
        </div>
      </div>

      {/* Summary and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {gradingResults.letter}
              </div>
              <div className="text-sm text-muted-foreground">Overall Grade</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {gradingResults.perNote.filter(n => n.ok).length}/{gradingResults.perNote.length}
              </div>
              <div className="text-sm text-muted-foreground">Notes Correct</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {(gradingResults.overall * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Areas for Improvement:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {gradingResults.pitchAcc < 0.8 && (
                <li>Focus on pitch accuracy - practice interval recognition and solfege</li>
              )}
              {gradingResults.rhythmAcc < 0.8 && (
                <li>Work on rhythmic precision - use a metronome for practice</li>
              )}
              {gradingResults.restAcc < 0.8 && (
                <li>Pay attention to rest durations - they are as important as notes</li>
              )}
              {gradingResults.overall >= 0.9 && (
                <li>Excellent performance! Try a more challenging difficulty level</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};