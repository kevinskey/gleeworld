import React, { useState, useEffect } from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, LogIn, LogOut, MapPin, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const CheckInCheckOutModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { user: authUser } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Check current check-in status
  useEffect(() => {
    if (authUser) {
      checkCurrentStatus();
      loadRecentSessions();
    }
  }, [authUser]);

  const checkCurrentStatus = async () => {
    if (!authUser) return;

    try {
      // Check for active check-in session
      const { data, error } = await supabase
        .from('member_check_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setIsCheckedIn(true);
        setCurrentSession(data[0]);
      } else {
        setIsCheckedIn(false);
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadRecentSessions = async () => {
    if (!authUser) return;

    try {
      const { data, error } = await supabase
        .from('member_check_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .order('check_in_time', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentSessions(data || []);
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!authUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_check_ins')
        .insert({
          user_id: authUser.id,
          check_in_time: new Date().toISOString(),
          location: 'Glee Club Rehearsal',
          event_type: 'rehearsal'
        })
        .select()
        .single();

      if (error) throw error;

      setIsCheckedIn(true);
      setCurrentSession(data);
      toast.success('Checked in successfully!');
      loadRecentSessions();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!authUser || !currentSession) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('member_check_ins')
        .update({
          check_out_time: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setIsCheckedIn(false);
      setCurrentSession(null);
      toast.success('Checked out successfully!');
      loadRecentSessions();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString([], { 
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Check In/Check Out</h2>
            <p className="text-sm text-muted-foreground">Track your attendance and time</p>
          </div>
        </div>
        <Badge variant={isCheckedIn ? "default" : "secondary"}>
          {isCheckedIn ? "Checked In" : "Available"}
        </Badge>
      </div>

      {/* Current Status */}
      <Card className={isCheckedIn ? "border-green-200 bg-green-50/50" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isCheckedIn ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCheckedIn && currentSession ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Checked in at:</span>
                <span className="font-medium">{formatTime(currentSession.check_in_time)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="font-medium">{calculateDuration(currentSession.check_in_time, null)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Location:</span>
                <span className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {currentSession.location || 'Glee Club'}
                </span>
              </div>
              <Button 
                onClick={handleCheckOut} 
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Check Out
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-muted-foreground">Ready to check in?</p>
              <Button 
                onClick={handleCheckIn} 
                disabled={loading}
                className="w-full"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Check In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.slice(0, 3).map((session, index) => (
                <div key={session.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(session.check_in_time)}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{formatTime(session.check_in_time)}</span>
                  </div>
                  <div className="text-right">
                    {session.check_out_time ? (
                      <span className="text-muted-foreground">
                        {calculateDuration(session.check_in_time, session.check_out_time)}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm">No recent check-ins</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};