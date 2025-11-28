import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, CheckCircle2, Clock, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  totalVotes: number;
  hasVoted: boolean;
  userVote?: string[];
  allowMultiple: boolean;
  closesAt?: string;
  status: 'active' | 'closed';
  createdBy: string;
  createdAt: string;
}

export const PollsSection = () => {
  const [polls] = useState<Poll[]>([
    {
      id: '1',
      question: 'Which concert repertoire would you prefer for Spring 2025?',
      description: 'Help us decide the repertoire for our upcoming spring concert',
      options: [
        { id: 'a', text: 'Classical Sacred Music', votes: 12, percentage: 40 },
        { id: 'b', text: 'Contemporary Gospel', votes: 15, percentage: 50 },
        { id: 'c', text: 'World Music Collection', votes: 3, percentage: 10 },
      ],
      totalVotes: 30,
      hasVoted: false,
      allowMultiple: false,
      status: 'active',
      createdBy: 'Dr. Johnson',
      createdAt: '2025-01-15',
      closesAt: '2025-01-30'
    },
    {
      id: '2',
      question: 'What time works best for sectional rehearsals?',
      description: 'Select all times that work for your schedule',
      options: [
        { id: 'a', text: 'Monday 4-5 PM', votes: 8, percentage: 27 },
        { id: 'b', text: 'Tuesday 5-6 PM', votes: 14, percentage: 47 },
        { id: 'c', text: 'Wednesday 3-4 PM', votes: 5, percentage: 17 },
        { id: 'd', text: 'Thursday 4-5 PM', votes: 3, percentage: 10 },
      ],
      totalVotes: 30,
      hasVoted: true,
      userVote: ['b'],
      allowMultiple: true,
      status: 'active',
      createdBy: 'Section Leader',
      createdAt: '2025-01-10',
      closesAt: '2025-01-25'
    },
    {
      id: '3',
      question: 'Rate your confidence with this week\'s music',
      options: [
        { id: 'a', text: 'Very confident', votes: 10, percentage: 33 },
        { id: 'b', text: 'Somewhat confident', votes: 15, percentage: 50 },
        { id: 'c', text: 'Need more practice', votes: 5, percentage: 17 },
      ],
      totalVotes: 30,
      hasVoted: true,
      userVote: ['b'],
      allowMultiple: false,
      status: 'closed',
      createdBy: 'Dr. Johnson',
      createdAt: '2025-01-05'
    },
  ]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  const handleVote = (pollId: string) => {
    console.log(`Submitting vote for poll ${pollId}:`, selectedOptions[pollId]);
    // TODO: Implement actual vote submission
  };

  const handleOptionChange = (pollId: string, optionId: string, isMultiple: boolean) => {
    if (isMultiple) {
      const current = selectedOptions[pollId] || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      setSelectedOptions({ ...selectedOptions, [pollId]: updated });
    } else {
      setSelectedOptions({ ...selectedOptions, [pollId]: [optionId] });
    }
  };

  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Course Polls</h2>
        <p className="text-muted-foreground">
          Participate in course polls and view results
        </p>
      </div>

      {/* Active Polls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Active Polls</h3>
          <Badge variant="default" className="rounded-full">
            {activePolls.filter(p => !p.hasVoted).length} need your vote
          </Badge>
        </div>

        {activePolls.map((poll) => (
          <Card key={poll.id} className={!poll.hasVoted ? 'border-primary/50' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{poll.question}</CardTitle>
                  {poll.description && (
                    <CardDescription>{poll.description}</CardDescription>
                  )}
                </div>
                {!poll.hasVoted && (
                  <Badge variant="default" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Vote needed
                  </Badge>
                )}
                {poll.hasVoted && (
                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Voted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {poll.totalVotes} votes
                </span>
                <span>By {poll.createdBy}</span>
                {poll.closesAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Closes {new Date(poll.closesAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {poll.hasVoted ? (
                // Show results
                <div className="space-y-3">
                  {poll.options.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          {option.text}
                          {poll.userVote?.includes(option.id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {option.votes} votes ({option.percentage}%)
                        </span>
                      </div>
                      <Progress value={option.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                // Show voting interface
                <div className="space-y-4">
                  {poll.allowMultiple ? (
                    <div className="space-y-3">
                      {poll.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${poll.id}-${option.id}`}
                            checked={(selectedOptions[poll.id] || []).includes(option.id)}
                            onCheckedChange={() => handleOptionChange(poll.id, option.id, true)}
                          />
                          <Label
                            htmlFor={`${poll.id}-${option.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedOptions[poll.id]?.[0]}
                      onValueChange={(value) => handleOptionChange(poll.id, value, false)}
                    >
                      {poll.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={`${poll.id}-${option.id}`} />
                          <Label
                            htmlFor={`${poll.id}-${option.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button
                    onClick={() => handleVote(poll.id)}
                    disabled={!selectedOptions[poll.id]?.length}
                    className="w-full"
                  >
                    Submit Vote
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Closed Polls */}
      {closedPolls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Past Polls</h3>
          {closedPolls.map((poll) => (
            <Card key={poll.id} className="opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <Badge variant="outline">Closed</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {poll.totalVotes} votes
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {poll.options.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          {option.text}
                          {poll.userVote?.includes(option.id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {option.votes} votes ({option.percentage}%)
                        </span>
                      </div>
                      <Progress value={option.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
