
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Users, CheckCircle, XCircle } from "lucide-react";

interface BulkW9EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalUsers: number;
}

interface EmailResult {
  userId: string;
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export const BulkW9EmailDialog = ({ open, onOpenChange, totalUsers }: BulkW9EmailDialogProps) => {
  const [customMessage, setCustomMessage] = useState("");
  const [excludeCompleted, setExcludeCompleted] = useState(true);
  const [reminderType, setReminderType] = useState<'initial' | 'reminder'>('initial');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const availableRoles = ['user', 'admin', 'super-admin'];

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSendEmails = async () => {
    try {
      setIsLoading(true);
      setResults([]);
      setShowResults(false);

      console.log('Sending bulk W9 emails with params:', {
        customMessage,
        includeRoles: selectedRoles.length > 0 ? selectedRoles : undefined,
        excludeCompleted,
        reminderType
      });

      const { data, error } = await supabase.functions.invoke('bulk-w9-email', {
        body: {
          customMessage: customMessage.trim() || undefined,
          includeRoles: selectedRoles.length > 0 ? selectedRoles : [],
          excludeCompleted,
          reminderType
        }
      });

      if (error) {
        throw error;
      }

      console.log('Bulk email response:', data);

      if (data.success) {
        setResults(data.results || []);
        setShowResults(true);
        
        toast({
          title: "Emails Sent Successfully",
          description: `${data.successCount} emails sent successfully${data.failureCount > 0 ? `, ${data.failureCount} failed` : ''}`,
        });
      } else {
        throw new Error(data.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending bulk W9 emails:', error);
      toast({
        title: "Error",
        description: `Failed to send emails: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCustomMessage("");
    setSelectedRoles([]);
    setExcludeCompleted(true);
    setReminderType('initial');
    setResults([]);
    setShowResults(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send W9 Forms to Users
          </DialogTitle>
          <DialogDescription>
            Send W9 tax form completion requests to users via email
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reminderType">Email Type</Label>
              <Select value={reminderType} onValueChange={(value: 'initial' | 'reminder') => setReminderType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial Request</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Target Users</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-completed"
                    checked={excludeCompleted}
                    onCheckedChange={setExcludeCompleted}
                  />
                  <Label htmlFor="exclude-completed" className="text-sm">
                    Exclude users who already completed W9 forms
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by Role (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableRoles.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm capitalize">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedRoles.length === 0 && (
                  <p className="text-xs text-gray-500">No role filter - will send to all users</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">Custom Message (optional)</Label>
              <Textarea
                id="custom-message"
                placeholder="Add a custom message to include in the email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Email Preview</span>
              </div>
              <p className="text-sm text-blue-800">
                This will send {reminderType === 'reminder' ? 'reminder' : 'initial'} W9 form emails to users
                {selectedRoles.length > 0 && ` with roles: ${selectedRoles.join(', ')}`}
                {excludeCompleted && ' (excluding those who already completed W9 forms)'}.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmails} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Emails
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{failureCount}</p>
              </div>
            </div>

            {failureCount > 0 && (
              <div className="space-y-2">
                <Label className="text-red-600 font-medium">Failed Emails:</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {results.filter(r => !r.success).map((result) => (
                    <div key={result.userId} className="text-sm bg-red-50 p-2 rounded">
                      <span className="font-medium">{result.email}</span>
                      <p className="text-red-600 text-xs">{result.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setShowResults(false)}>
                Send More Emails
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
