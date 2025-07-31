import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Clock, 
  Save, 
  Calendar,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';

interface SendControlsProps {
  title: string;
  content: string;
  selectedGroups: any[];
  selectedChannels: string[];
  recipientCount: number;
  isLoading: boolean;
  scheduledFor?: Date;
  onScheduledForChange: (date: Date | undefined) => void;
  onSend: () => void;
  onSaveDraft: () => void;
}

export const SendControls = ({
  title,
  content,
  selectedGroups,
  selectedChannels,
  recipientCount,
  isLoading,
  scheduledFor,
  onScheduledForChange,
  onSend,
  onSaveDraft
}: SendControlsProps) => {
  const [enableScheduling, setEnableScheduling] = useState(false);

  const canSend = title && content && selectedGroups.length > 0 && selectedChannels.length > 0;
  const canSaveDraft = title && content;

  const getValidationMessages = () => {
    const issues = [];
    if (!title) issues.push('Subject line required');
    if (!content) issues.push('Message content required');
    if (selectedGroups.length === 0) issues.push('Select recipients');
    if (selectedChannels.length === 0) issues.push('Choose delivery method');
    return issues;
  };

  const validationIssues = getValidationMessages();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Readiness Check</Label>
          <div className="space-y-1">
            {validationIssues.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Ready to send</span>
              </div>
            ) : (
              validationIssues.map((issue, index) => (
                <div key={index} className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{issue}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Summary */}
        {canSend && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <h4 className="text-sm font-medium">Delivery Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Recipients:</span>
                <span className="ml-2 font-medium">{recipientCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Channels:</span>
                <span className="ml-2 font-medium">{selectedChannels.length}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedChannels.map(channel => (
                <Badge key={channel} variant="secondary" className="text-xs">
                  {channel.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Scheduling */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Schedule for Later</Label>
            <Switch 
              checked={enableScheduling}
              onCheckedChange={setEnableScheduling}
            />
          </div>
          
          {enableScheduling && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Select date and time
              </Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={scheduledFor ? scheduledFor.toISOString().slice(0, 16) : ''}
                  onChange={(e) => onScheduledForChange(e.target.value ? new Date(e.target.value) : undefined)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={onSend}
            disabled={!canSend || isLoading}
            size="lg"
            className="h-12"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : enableScheduling && scheduledFor ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Message
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={!canSaveDraft || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Tip:</strong> Draft messages are saved automatically</p>
          <p>🔔 Recipients will be notified based on their preferences</p>
          {selectedChannels.includes('sms') && (
            <p>📱 SMS messages are limited to 160 characters</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};