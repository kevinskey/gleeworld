import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Square, Trash2, Edit, BarChart3, RefreshCw, Radio, Users } from 'lucide-react';
import { AcademyPoll, PollQuestion } from './AcademyPollSystem';
import { PollEditor } from './PollEditor';
import { PollResults } from './PollResults';

interface PollAdminInterfaceProps {
  polls: AcademyPoll[];
  onCreatePoll: (title: string, description: string, questions: PollQuestion[]) => Promise<any>;
  onTogglePoll: (pollId: string, isActive: boolean) => Promise<void>;
  onDeletePoll: (pollId: string) => Promise<void>;
  onStartLive: (poll: AcademyPoll) => Promise<void>;
  onRefresh: () => void;
}

export const PollAdminInterface: React.FC<PollAdminInterfaceProps> = ({
  polls,
  onCreatePoll,
  onTogglePoll,
  onDeletePoll,
  onStartLive,
  onRefresh
}) => {
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPoll, setEditingPoll] = useState<AcademyPoll | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);

  const handleCreatePoll = async () => {
    const result = await onCreatePoll(newPollTitle, newPollDescription, []);
    if (result) {
      setNewPollTitle('');
      setNewPollDescription('');
    }
  };

  if (showResults) {
    const poll = polls.find(p => p.id === showResults);
    if (poll) {
      return (
        <PollResults 
          poll={poll} 
          onClose={() => setShowResults(null)} 
        />
      );
    }
  }

  if (showEditor && editingPoll) {
    return (
      <PollEditor
        poll={editingPoll}
        onClose={() => {
          setShowEditor(false);
          setEditingPoll(null);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Poll */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Poll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Poll title..."
            value={newPollTitle}
            onChange={(e) => setNewPollTitle(e.target.value)}
          />
          <Textarea
            placeholder="Poll description (optional)..."
            value={newPollDescription}
            onChange={(e) => setNewPollDescription(e.target.value)}
            rows={2}
          />
          <Button onClick={handleCreatePoll} disabled={!newPollTitle.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        </CardContent>
      </Card>

      {/* Polls List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Manage Polls ({polls.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {polls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No polls created yet. Create your first poll above!
            </p>
          ) : (
            <div className="space-y-3">
              {polls.map((poll) => (
                <div
                  key={poll.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{poll.title}</h4>
                      {poll.is_active && (
                        <Badge variant="default" className="bg-green-500">
                          Active
                        </Badge>
                      )}
                      {poll.is_live_session && (
                        <Badge variant="secondary">
                          <Radio className="h-3 w-3 mr-1 animate-pulse" />
                          Live
                        </Badge>
                      )}
                    </div>
                    {poll.description && (
                      <p className="text-sm text-muted-foreground">{poll.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {poll.questions.length} question{poll.questions.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResults(poll.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPoll(poll);
                        setShowEditor(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {poll.questions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStartLive(poll)}
                        disabled={poll.is_live_session}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Live
                      </Button>
                    )}
                    <Button
                      variant={poll.is_active ? "secondary" : "default"}
                      size="sm"
                      onClick={() => onTogglePoll(poll.id, !poll.is_active)}
                    >
                      {poll.is_active ? (
                        <>
                          <Square className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePoll(poll.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
