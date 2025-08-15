import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradingResults } from './hooks/useGrading';

interface ErrorVisualizationProps {
  results: GradingResults;
}

export const ErrorVisualization: React.FC<ErrorVisualizationProps> = ({ results }) => {
  if (!results.perNote || results.perNote.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Note-by-Note Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No note-level data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxPitchError = Math.max(...results.perNote.map(note => Math.abs(note.pitchErrCents)));
  const maxTimingError = Math.max(...results.perNote.map(note => Math.abs(note.onsetErrMs)));
  const maxDurationError = Math.max(...results.perNote.map(note => Math.abs(note.durErrPct)));

  const getPitchErrorColor = (cents: number) => {
    const absCents = Math.abs(cents);
    if (absCents <= 25) return 'bg-green-500';
    if (absCents <= 50) return 'bg-yellow-500';
    if (absCents <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTimingErrorColor = (ms: number) => {
    const absMs = Math.abs(ms);
    if (absMs <= 50) return 'bg-green-500';
    if (absMs <= 100) return 'bg-yellow-500';
    if (absMs <= 200) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDurationErrorColor = (pct: number) => {
    const absPct = Math.abs(pct);
    if (absPct <= 10) return 'bg-green-500';
    if (absPct <= 25) return 'bg-yellow-500';
    if (absPct <= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Note-by-Note Error Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pitch Errors */}
        <div>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
            Pitch Errors (cents)
            <Badge variant="outline" className="text-xs">±{maxPitchError.toFixed(0)} max</Badge>
          </h4>
          <div className="space-y-1">
            {results.perNote.map((note, index) => (
              <div key={`pitch-${index}`} className="flex items-center gap-2">
                <span className="text-xs w-8">N{note.i + 1}</span>
                <div className="flex-1 relative h-4 bg-muted rounded">
                  <div 
                    className={`h-full rounded transition-all ${getPitchErrorColor(note.pitchErrCents)}`}
                    style={{ 
                      width: `${maxPitchError > 0 ? (Math.abs(note.pitchErrCents) / maxPitchError) * 100 : 0}%`,
                      marginLeft: note.pitchErrCents < 0 ? `${maxPitchError > 0 ? (Math.abs(note.pitchErrCents) / maxPitchError) * 50 : 0}%` : '50%'
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                <span className="text-xs w-12 text-right">
                  {note.pitchErrCents > 0 ? '+' : ''}{note.pitchErrCents.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Errors */}
        <div>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
            Timing Errors (ms)
            <Badge variant="outline" className="text-xs">±{maxTimingError.toFixed(0)} max</Badge>
          </h4>
          <div className="space-y-1">
            {results.perNote.map((note, index) => (
              <div key={`timing-${index}`} className="flex items-center gap-2">
                <span className="text-xs w-8">N{note.i + 1}</span>
                <div className="flex-1 relative h-4 bg-muted rounded">
                  <div 
                    className={`h-full rounded transition-all ${getTimingErrorColor(note.onsetErrMs)}`}
                    style={{ 
                      width: `${maxTimingError > 0 ? (Math.abs(note.onsetErrMs) / maxTimingError) * 100 : 0}%`,
                      marginLeft: note.onsetErrMs < 0 ? `${maxTimingError > 0 ? (Math.abs(note.onsetErrMs) / maxTimingError) * 50 : 0}%` : '50%'
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                <span className="text-xs w-12 text-right">
                  {note.onsetErrMs > 0 ? '+' : ''}{note.onsetErrMs.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Errors */}
        <div>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
            Duration Errors (%)
            <Badge variant="outline" className="text-xs">±{maxDurationError.toFixed(0)} max</Badge>
          </h4>
          <div className="space-y-1">
            {results.perNote.map((note, index) => (
              <div key={`duration-${index}`} className="flex items-center gap-2">
                <span className="text-xs w-8">N{note.i + 1}</span>
                <div className="flex-1 relative h-4 bg-muted rounded">
                  <div 
                    className={`h-full rounded transition-all ${getDurationErrorColor(note.durErrPct)}`}
                    style={{ 
                      width: `${maxDurationError > 0 ? (Math.abs(note.durErrPct) / maxDurationError) * 100 : 0}%`,
                      marginLeft: note.durErrPct < 0 ? `${maxDurationError > 0 ? (Math.abs(note.durErrPct) / maxDurationError) * 50 : 0}%` : '50%'
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                <span className="text-xs w-12 text-right">
                  {note.durErrPct > 0 ? '+' : ''}{note.durErrPct.toFixed(0)}
                </span>
                {note.ok && <Badge variant="outline" className="text-xs h-4">✓</Badge>}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 border-t">
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Excellent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span>Fair</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Needs Work</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};