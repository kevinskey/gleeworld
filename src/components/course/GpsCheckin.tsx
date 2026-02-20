import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, LogIn, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
  const [permissionQueried, setPermissionQueried] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Find today's active attendance session for this course
  const { data: todaySession } = useQuery({
    queryKey: ['gps-today-session', courseId],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Find the next session that hasn't closed yet
      const { data, error } = await supabase
        .from('gw_attendance_sessions')
        .select('*')
        .eq('course_id', courseId)
        .in('status', ['active', 'scheduled'])
        .gte('closes_at', now)
        .order('opens_at', { ascending: true })
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

  const isInRehearsal = existingRecord?.status === 'in_rehearsal';
  const isPresent = existingRecord?.status === 'present';
  const isCheckedIn = isInRehearsal || isPresent;
  
  // Determine if the session window is currently open
  const isSessionOpen = useMemo(() => {
    if (!todaySession) return false;
    const now = new Date();
    return now >= new Date(todaySession.opens_at) && now <= new Date(todaySession.closes_at);
  }, [todaySession]);

  const sessionLabel = useMemo(() => {
    if (!todaySession) return '';
    const opensAt = new Date(todaySession.opens_at);
    const now = new Date();
    const isToday = opensAt.toDateString() === now.toDateString();
    const timeStr = format(opensAt, 'h:mm a');
    if (isToday) return `Today at ${timeStr}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (opensAt.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${timeStr}`;
    return `${format(opensAt, 'EEE, MMM d')} at ${timeStr}`;
  }, [todaySession]);

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState('error');
      setPermissionQueried(true);
      return;
    }
    setGeoState('locating');

    // First check the permission state if the API is available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionQueried(true);
        if (result.state === 'denied') {
          setGeoState('denied');
          return;
        }
        // Actually get position
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
      }).catch(() => {
        // Permissions API not supported — fall back to direct call
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPermissionQueried(true);
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
            setPermissionQueried(true);
            if (err.code === err.PERMISSION_DENIED) {
              setGeoState('denied');
            } else {
              setGeoState('error');
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPermissionQueried(true);
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
          setPermissionQueried(true);
          if (err.code === err.PERMISSION_DENIED) {
            setGeoState('denied');
          } else {
            setGeoState('error');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  // Auto-check location on mount
  useEffect(() => {
    if (todaySession && isSessionOpen) {
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
          status: 'in_rehearsal',
          check_in_method: 'gps',
          marked_at: new Date().toISOString(),
          note: `GPS check-in (${distance}m from ${REHEARSAL_LOCATION.name})`,
        },
        { onConflict: 'attendance_session_id,student_profile_id' },
      );
      if (error) throw error;

      const isMus070 = courseId === 'a0000000-0000-0000-0000-000000000070';
      toast({ title: '✅ Checked In', description: isMus070 ? `You're in rehearsal. Scan the checkout QR at the end of class to be marked present.` : `You're checked in. Scan the checkout QR at the end of class to be marked present.` });
      refetchRecord();
    } catch (err: any) {
      toast({ title: 'Check-in failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // No manual checkout - students must scan checkout QR

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
              {isPresent ? 'Attendance confirmed' : isInRehearsal ? 'In Rehearsal' : courseId === 'a0000000-0000-0000-0000-000000000070' ? 'Rehearsal Attendance' : 'Class Attendance'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPresent && 'You are marked present for this session'}
              {isInRehearsal && 'Scan the checkout QR at end of class to be marked present'}
              {!isCheckedIn && !isSessionOpen && sessionLabel}
              {!isCheckedIn && isSessionOpen && geoState === 'locating' && 'Locating you...'}
              {!isCheckedIn && isSessionOpen && geoState === 'in-range' && `You're within range (${distance}m)`}
              {!isCheckedIn && isSessionOpen && geoState === 'out-of-range' &&
                `${distance}m away — must be within ${REHEARSAL_LOCATION.radiusMeters}m`}
              {!isCheckedIn && isSessionOpen && geoState === 'denied' && (
                <span className="text-destructive">
                  Location blocked. Open browser Settings → Site Settings → Location and allow access, then retry.
                </span>
              )}
              {!isCheckedIn && isSessionOpen && geoState === 'error' && 'Could not get location. Check your connection and retry.'}
              {!isCheckedIn && isSessionOpen && geoState === 'idle' && 'Tap to verify location'}
            </p>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {!isSessionOpen && !isCheckedIn ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Upcoming
              </Badge>
            ) : isPresent ? (
              <Badge className="text-xs bg-green-600 text-white border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Present
              </Badge>
            ) : isInRehearsal ? (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                In Rehearsal
              </Badge>
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
            ) : geoState === 'out-of-range' ? (
              <Button size="sm" variant="outline" onClick={checkLocation} className="text-xs">
                Retry
              </Button>
            ) : geoState === 'denied' || geoState === 'error' ? (
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
