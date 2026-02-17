import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle2, XCircle, Loader2, LogIn, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Spelman College Fine Arts Building
const REHEARSAL_LOCATION = {
  lat: 33.7468,
  lng: -84.4133,
  radiusMeters: 50,
  name: 'Fine Arts Building',
};

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface GpsCheckinProps {
  courseId: string;
}

export const GpsCheckin: React.FC<GpsCheckinProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { profile } = useMergedProfile(user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'in-range' | 'out-of-range' | 'denied' | 'error'>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Find today's active attendance session for this course
  const { data: todaySession } = useQuery({
    queryKey: ['gps-today-session', courseId],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data, error } = await supabase
        .from('gw_attendance_sessions')
        .select('*')
        .eq('course_id', courseId)
        .in('status', ['active', 'scheduled'])
        .gte('opens_at', startOfDay)
        .lt('opens_at', endOfDay)
        .order('opens_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Check if already checked in
  const { data: existingRecord, refetch: refetchRecord } = useQuery({
    queryKey: ['gps-checkin-status', todaySession?.id, profile?.id],
    queryFn: async () => {
      if (!todaySession?.id || !profile?.id) return null;
      const { data, error } = await supabase
        .from('gw_attendance_records')
        .select('*')
        .eq('attendance_session_id', todaySession.id)
        .eq('student_profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!todaySession?.id && !!profile?.id,
  });

  const isCheckedIn = existingRecord?.status === 'present';

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState('error');
      return;
    }
    setGeoState('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          REHEARSAL_LOCATION.lat,
          REHEARSAL_LOCATION.lng,
        );
        setDistance(Math.round(dist));
        setGeoState(dist <= REHEARSAL_LOCATION.radiusMeters ? 'in-range' : 'out-of-range');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState('denied');
        } else {
          setGeoState('error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  // Auto-check location on mount
  useEffect(() => {
    if (todaySession) {
      checkLocation();
    }
  }, [todaySession, checkLocation]);

  const handleCheckin = async () => {
    if (!todaySession?.id || !profile?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('gw_attendance_records').upsert(
        {
          attendance_session_id: todaySession.id,
          student_profile_id: profile.id,
          status: 'present',
          check_in_method: 'gps',
          marked_at: new Date().toISOString(),
          note: `GPS check-in (${distance}m from ${REHEARSAL_LOCATION.name})`,
        },
        { onConflict: 'attendance_session_id,student_profile_id' },
      );
      if (error) throw error;

      toast({ title: '✅ Checked In', description: `You're marked present at ${REHEARSAL_LOCATION.name}.` });
      refetchRecord();
    } catch (err: any) {
      toast({ title: 'Check-in failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!todaySession?.id || !profile?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_attendance_records')
        .update({
          status: 'checked_out',
          note: `GPS check-out at ${new Date().toLocaleTimeString()}`,
          updated_at: new Date().toISOString(),
        })
        .eq('attendance_session_id', todaySession.id)
        .eq('student_profile_id', profile.id);
      if (error) throw error;

      toast({ title: 'Checked Out', description: 'You have been checked out.' });
      refetchRecord();
    } catch (err: any) {
      toast({ title: 'Check-out failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // No active session today — don't show anything
  if (!todaySession) return null;

  return (
    <Card className="border-2 border-primary/30 shadow-sm">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className="shrink-0">
            {geoState === 'locating' && <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />}
            {geoState === 'in-range' && <MapPin className="h-8 w-8 text-green-600" />}
            {geoState === 'out-of-range' && <MapPin className="h-8 w-8 text-destructive" />}
            {(geoState === 'idle' || geoState === 'denied' || geoState === 'error') && (
              <MapPin className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              {isCheckedIn ? 'You are checked in' : 'Rehearsal Attendance'}
            </p>
            <p className="text-xs text-muted-foreground">
              {geoState === 'locating' && 'Locating you...'}
              {geoState === 'in-range' &&
                (isCheckedIn
                  ? `Checked in · ${distance}m from ${REHEARSAL_LOCATION.name}`
                  : `You're within range (${distance}m)`)}
              {geoState === 'out-of-range' &&
                `${distance}m away — must be within ${REHEARSAL_LOCATION.radiusMeters}m`}
              {geoState === 'denied' && 'Location permission denied — enable in settings'}
              {geoState === 'error' && 'Could not determine your location'}
              {geoState === 'idle' && 'Tap to verify location'}
            </p>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {isCheckedIn ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckout}
                disabled={submitting}
                className="text-xs"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 mr-1" />}
                Out
              </Button>
            ) : geoState === 'in-range' ? (
              <Button
                size="sm"
                onClick={handleCheckin}
                disabled={submitting}
                className="text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
                Check In
              </Button>
            ) : geoState === 'out-of-range' || geoState === 'denied' || geoState === 'error' ? (
              <Button size="sm" variant="outline" onClick={checkLocation} className="text-xs">
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
