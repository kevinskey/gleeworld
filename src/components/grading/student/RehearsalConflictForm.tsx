import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Clock, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export const RehearsalConflictForm: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [excuseType, setExcuseType] = useState<'full' | 'partial'>('partial');
  const [reason, setReason] = useState('');

  // Fetch existing requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['rehearsal-excuse-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_rehearsal_excuse_requests' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const resetForm = () => {
    setCourseName('');
    setCourseCode('');
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setExcuseType('partial');
    setReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!courseName.trim() || selectedDays.length === 0 || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('gw_rehearsal_excuse_requests' as any)
        .insert({
          user_id: user.id,
          conflict_course_name: courseName.trim(),
          conflict_course_code: courseCode.trim() || null,
          conflict_days: selectedDays,
          conflict_start_time: startTime,
          conflict_end_time: endTime,
          excuse_type: excuseType,
          reason: reason.trim() || null,
        });

      if (error) throw error;

      toast.success('Conflict request submitted for review');
      queryClient.invalidateQueries({ queryKey: ['rehearsal-excuse-requests'] });
      resetForm();
      setOpen(false);
    } catch (err) {
      console.error('Error submitting conflict request:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Conflict Excuse Requests
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Submit a class conflict for super-admin review to excuse absences
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Report Schedule Conflict</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Course Name *</Label>
                    <Input
                      value={courseName}
                      onChange={e => setCourseName(e.target.value)}
                      placeholder="e.g. Intro to Biology"
                      className="text-sm"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Course Code</Label>
                    <Input
                      value={courseCode}
                      onChange={e => setCourseCode(e.target.value)}
                      placeholder="e.g. BIO 101"
                      className="text-sm"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Days of Conflict *</Label>
                  <div className="flex gap-1.5">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          selectedDays.includes(day)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time *</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Time *</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Excuse Type *</Label>
                  <Select value={excuseType} onValueChange={(v: 'full' | 'partial') => setExcuseType(v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partial">Partial (late arrival / early departure)</SelectItem>
                      <SelectItem value="full">Full (entire rehearsal missed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Additional Notes</Label>
                  <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Explain why this conflict requires an excuse..."
                    className="text-sm resize-none"
                    rows={2}
                    maxLength={500}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit for Review'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-xs text-muted-foreground">Loading...</div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {req.conflict_course_code ? `${req.conflict_course_code} — ` : ''}{req.conflict_course_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {req.conflict_days?.join(', ')} · {req.conflict_start_time?.slice(0, 5)}–{req.conflict_end_time?.slice(0, 5)} · {req.excuse_type === 'full' ? 'Full' : 'Partial'} excuse
                  </p>
                  {req.review_notes && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic">"{req.review_notes}"</p>
                  )}
                </div>
                <div className="shrink-0 ml-2">
                  {getStatusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            No conflict requests submitted yet. Tap "Add" to report a scheduling conflict.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
