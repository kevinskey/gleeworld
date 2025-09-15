import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, Target, CheckCircle, LogIn, LogOut, Calendar, Timer } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const TimesheetDashboard = () => {
  const {
    currentTimesheet,
    timeEntries,
    activeEntry,
    loading,
    checkIn,
    checkOut,
    updateWeeklyGoal,
    submitWeeklyEvaluation,
    getTotalWorkedHours,
    isEndOfWeek
  } = useTimesheet();

  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [goalMet, setGoalMet] = useState<string>('');
  const [evaluation, setEvaluation] = useState('');
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleCheckIn = async () => {
    await checkIn(checkInNotes);
    setCheckInNotes('');
  };

  const handleCheckOut = async () => {
    await checkOut(breakMinutes, checkOutNotes);
    setCheckOutNotes('');
    setBreakMinutes(0);
    setShowCheckOutDialog(false);
  };

  const handleGoalSubmit = async () => {
    if (weeklyGoal.trim()) {
      await updateWeeklyGoal(weeklyGoal);
      setWeeklyGoal('');
    }
  };

  const handleEvaluationSubmit = async () => {
    if (goalMet && evaluation.trim()) {
      await submitWeeklyEvaluation(goalMet === 'yes', evaluation);
      setGoalMet('');
      setEvaluation('');
      setShowEvaluationDialog(false);
    }
  };

  if (!currentTimesheet) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Loading Timesheet</h3>
              <p className="text-muted-foreground">Setting up your weekly timesheet...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Timesheet</h1>
            <p className="text-muted-foreground">
              Week of {new Date(currentTimesheet.week_start_date).toLocaleDateString()} - {new Date(currentTimesheet.week_end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant={currentTimesheet.status === 'active' ? 'default' : 'secondary'}>
          {currentTimesheet.status.charAt(0).toUpperCase() + currentTimesheet.status.slice(1)}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{getTotalWorkedHours().toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{timeEntries.filter(e => e.check_out_time).length}</p>
                <p className="text-xs text-muted-foreground">Completed Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">
                  {currentTimesheet.weekly_goal ? 'Goal Set' : 'No Goal'}
                </p>
                <p className="text-xs text-muted-foreground">Weekly Goal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status & Check In/Out */}
      <Card className={activeEntry ? "border-green-200 bg-green-50/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeEntry ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5" />}
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEntry ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Checked in at:</p>
                  <p className="font-medium">{formatTime(activeEntry.check_in_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration:</p>
                  <p className="font-medium">{calculateDuration(activeEntry.check_in_time, null)}</p>
                </div>
              </div>
              
              <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check Out</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="breakMinutes">Break Duration (minutes)</Label>
                      <Input
                        id="breakMinutes"
                        type="number"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkOutNotes">Notes</Label>
                      <Textarea
                        id="checkOutNotes"
                        value={checkOutNotes}
                        onChange={(e) => setCheckOutNotes(e.target.value)}
                        placeholder="Any notes about your work session..."
                      />
                    </div>
                    <Button onClick={handleCheckOut} disabled={loading} className="w-full">
                      Check Out
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Ready to start your work day?</p>
              <div>
                <Label htmlFor="checkInNotes">Notes (optional)</Label>
                <Textarea
                  id="checkInNotes"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="What will you be working on today?"
                />
              </div>
              <Button onClick={handleCheckIn} disabled={loading} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Check In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Goal Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Weekly Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTimesheet.weekly_goal ? (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">Current Goal:</p>
              <p className="text-sm text-muted-foreground mt-1">{currentTimesheet.weekly_goal}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No weekly goal set yet.</p>
          )}
          
          {currentTimesheet.status === 'active' && (
            <div className="space-y-2">
              <Label htmlFor="weeklyGoal">Set/Update Weekly Goal</Label>
              <div className="flex gap-2">
                <Textarea
                  id="weeklyGoal"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(e.target.value)}
                  placeholder="What do you want to accomplish this week?"
                />
                <Button onClick={handleGoalSubmit} disabled={!weeklyGoal.trim()}>
                  Set Goal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Evaluation (only show on weekends) */}
      {isEndOfWeek() && currentTimesheet.status === 'active' && currentTimesheet.weekly_goal && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
              <DialogTrigger asChild>
                <Button>Submit Weekly Evaluation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Weekly Goal Evaluation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Did you meet your weekly goal?</Label>
                    <RadioGroup value={goalMet} onValueChange={setGoalMet}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes" />
                        <Label htmlFor="yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no" />
                        <Label htmlFor="no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="evaluation">Evaluation & Reflection</Label>
                    <Textarea
                      id="evaluation"
                      value={evaluation}
                      onChange={(e) => setEvaluation(e.target.value)}
                      placeholder="How did the week go? What did you accomplish? What could be improved?"
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleEvaluationSubmit} 
                    disabled={!goalMet || !evaluation.trim()}
                    className="w-full"
                  >
                    Submit Evaluation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length > 0 ? (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{formatDate(entry.check_in_time)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(entry.check_in_time)} - {entry.check_out_time ? formatTime(entry.check_out_time) : 'Active'}
                      </p>
                    </div>
                    {entry.notes && (
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.check_out_time ? (
                      <div>
                        <p className="font-medium">{entry.total_hours?.toFixed(1)}h</p>
                        {entry.break_duration_minutes > 0 && (
                          <p className="text-xs text-muted-foreground">Break: {entry.break_duration_minutes}m</p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No time entries yet this week.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};