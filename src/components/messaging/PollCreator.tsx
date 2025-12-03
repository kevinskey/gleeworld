import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Plus, X } from 'lucide-react';
import { usePoll } from '@/hooks/usePoll';
import { useToast } from '@/hooks/use-toast';

interface PollCreatorProps {
  groupId: string;
  onPollCreated?: () => void;
  inline?: boolean; // When true, renders form directly without Dialog wrapper
}

export const PollCreator: React.FC<PollCreatorProps> = ({ groupId, onPollCreated, inline = false }) => {
  const { toast } = useToast();
  const { createPoll } = usePoll();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [isCreating, setIsCreating] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setIsAnonymous(false);
    setExpiresIn('never');
  };

  const handleCreate = async () => {
    // Validation
    if (!question.trim()) {
      toast({
        title: 'Question Required',
        description: 'Please enter a poll question',
        variant: 'destructive'
      });
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast({
        title: 'Options Required',
        description: 'Please provide at least 2 options',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCreating(true);

      const expiresInHours = expiresIn === 'never' ? undefined : parseInt(expiresIn);

      await createPoll(groupId, question, validOptions, {
        allowMultiple,
        isAnonymous,
        expiresInHours
      });

      toast({
        title: 'Poll Created',
        description: 'Your poll has been posted to the group'
      });

      resetForm();
      if (!inline) {
        setOpen(false);
      }

      onPollCreated?.();
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create poll. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const formContent = (
    <div className="space-y-4">
      {/* Question */}
      <div className="space-y-2">
        <Label htmlFor="question">Question</Label>
        <Input
          id="question"
          placeholder="What would you like to ask?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          {question.length}/200 characters
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label>Options</Label>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              maxLength={100}
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="multiple">Allow multiple selections</Label>
            <p className="text-xs text-muted-foreground">
              Members can choose more than one option
            </p>
          </div>
          <Switch
            id="multiple"
            checked={allowMultiple}
            onCheckedChange={setAllowMultiple}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="anonymous">Anonymous voting</Label>
            <p className="text-xs text-muted-foreground">
              Hide who voted for what
            </p>
          </div>
          <Switch
            id="anonymous"
            checked={isAnonymous}
            onCheckedChange={setIsAnonymous}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Poll duration</Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger id="expires">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never expires</SelectItem>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="24">1 day</SelectItem>
              <SelectItem value="72">3 days</SelectItem>
              <SelectItem value="168">1 week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions for inline mode */}
      {inline && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
          >
            {isCreating ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      )}
    </div>
  );

  // Inline mode - just render the form
  if (inline) {
    return formContent;
  }

  // Dialog mode - wrap form in Dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Create Poll"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {formContent}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
          >
            {isCreating ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
