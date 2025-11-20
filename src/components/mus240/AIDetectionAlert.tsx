import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Bot, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIDetectionAlertProps {
  detected: boolean;
  confidence?: number | null;
  reasoning?: string | null;
  compact?: boolean;
}

export const AIDetectionAlert: React.FC<AIDetectionAlertProps> = ({
  detected,
  confidence,
  reasoning,
  compact = false
}) => {
  if (!detected) {
    if (compact) return null;
    
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Authentic Work Detected</AlertTitle>
        <AlertDescription className="text-green-800">
          This submission appears to be original student work.
        </AlertDescription>
      </Alert>
    );
  }

  const confidenceLevel = confidence || 0;
  const severity = confidenceLevel >= 0.8 ? 'high' : confidenceLevel >= 0.5 ? 'medium' : 'low';
  
  const severityColors = {
    high: {
      border: 'border-red-300',
      bg: 'bg-red-50',
      text: 'text-red-900',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800 border-red-300'
    },
    medium: {
      border: 'border-orange-300',
      bg: 'bg-orange-50',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-800 border-orange-300'
    },
    low: {
      border: 'border-yellow-300',
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  };

  const colors = severityColors[severity];

  if (compact) {
    return (
      <Badge variant="outline" className={`${colors.badge} flex items-center gap-1`}>
        <Bot className="h-3 w-3" />
        AI Detected ({Math.round(confidenceLevel * 100)}%)
      </Badge>
    );
  }

  return (
    <Alert className={`${colors.border} ${colors.bg} relative z-50`}>
      <AlertTriangle className={`h-4 w-4 ${colors.icon}`} />
      <AlertTitle className={`${colors.text} flex items-center gap-2`}>
        ⚠️ Potential AI-Generated Content Detected
        {confidence !== null && confidence !== undefined && (
          <Badge variant="outline" className={colors.badge}>
            {Math.round(confidenceLevel * 100)}% confidence
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className={colors.text}>
        <div className="space-y-2 mt-2">
          <p className="font-medium">
            This submission shows indicators of AI-generated writing.
          </p>
          {reasoning && (
            <div className="mt-2 p-3 bg-white/50 rounded-md text-sm">
              <p className="font-semibold mb-1">Detection Analysis:</p>
              <p>{reasoning}</p>
            </div>
          )}
          <p className="text-sm mt-2 italic">
            ⚠️ Review this submission carefully and consider discussing academic integrity with the student.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
