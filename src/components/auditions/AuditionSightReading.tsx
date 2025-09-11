import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SightSingingWidget } from '@/components/shared/SightSingingWidget';
import { SightSingingResult } from '@/hooks/useSightSingingAI';
import { Button } from '@/components/ui/button';
import { Clock, Music } from 'lucide-react';

interface AuditionSightReadingProps {
  onStartAudition?: (exercise: SightSingingResult) => void;
  timeLimit?: number; // in minutes
}

export const AuditionSightReading: React.FC<AuditionSightReadingProps> = ({
  onStartAudition,
  timeLimit = 5
}) => {
  const [currentExercise, setCurrentExercise] = React.useState<SightSingingResult | null>(null);
  const [isAuditionStarted, setIsAuditionStarted] = React.useState(false);

  const handleExerciseGenerated = (result: SightSingingResult) => {
    setCurrentExercise(result);
  };

  const handleStartAudition = (result: SightSingingResult) => {
    setIsAuditionStarted(true);
    onStartAudition?.(result);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Audition Sight Reading Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Time Limit: {timeLimit} minutes</span>
            </div>
            <p className="text-sm text-blue-800">
              You will have {timeLimit} minutes to study the exercise, then perform it. 
              The exercise will be generated based on intermediate difficulty suitable for auditions.
            </p>
          </div>

          <SightSingingWidget
            context="audition"
            defaultParams={{
              difficulty: 'intermediate',
              measures: 8,
              key: { tonic: 'C', mode: 'major' }
            }}
            showAdvancedControls={false}
            onExerciseGenerated={handleExerciseGenerated}
            onStartPractice={handleStartAudition}
          />

          {currentExercise && !isAuditionStarted && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Exercise ready! Take your time to study the music, then click "Practice" when you're ready to begin your audition.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};