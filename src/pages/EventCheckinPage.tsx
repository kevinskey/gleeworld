import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Calendar, MapPin, Clock, LogIn } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventData {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
}

const EventCheckinPage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!token) {
        setError("Invalid check-in link");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("gw_events")
          .select("id, title, start_date, end_date, location, description")
          .eq("event_qr_token", token)
          .single();

        if (fetchError || !data) {
          setError("Event not found or link has expired");
          setLoading(false);
          return;
        }

        setEvent(data);

        // Check if user already checked in
        if (user) {
          const { data: existingAttendance } = await supabase
            .from("attendance")
            .select("id")
            .eq("event_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (existingAttendance) {
            setCheckedIn(true);
          }
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchEvent();
    }
  }, [token, user, authLoading]);

  const handleCheckin = async () => {
    if (!event || !user) return;

    setCheckingIn(true);
    try {
      const { error: insertError } = await supabase.from("attendance").insert({
        event_id: event.id,
        user_id: user.id,
        status: "present",
        recorded_at: new Date().toISOString(),
      });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation - already checked in
          setCheckedIn(true);
          toast.info("You're already checked in!");
        } else {
          throw insertError;
        }
      } else {
        setCheckedIn(true);
        toast.success("Successfully checked in!");
      }
    } catch (err) {
      console.error("Check-in error:", err);
      toast.error("Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading event..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Check-in Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // Store the current URL for redirect after auth
    sessionStorage.setItem("redirectAfterAuth", `/event-checkin/${token}`);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <LogIn className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Please sign in to check in to this event.
            </p>
            {event && (
              <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.start_date), "PPP 'at' p")}
                </p>
              </div>
            )}
            <Link to="/auth">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">
            {checkedIn ? "You're Checked In!" : "Event Check-In"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkedIn ? (
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{event?.title}</h3>
              <p className="text-muted-foreground mb-6">
                Your attendance has been recorded.
              </p>
              <Link to="/calendar">
                <Button variant="outline">View Calendar</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <h3 className="text-xl font-semibold">{event?.title}</h3>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {event && format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {event && format(new Date(event.start_date), "h:mm a")}
                    {event?.end_date && ` - ${format(new Date(event.end_date), "h:mm a")}`}
                  </span>
                </div>
                
                {event?.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleCheckin} 
                disabled={checkingIn}
                className="w-full"
                size="lg"
              >
                {checkingIn ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Check In Now
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventCheckinPage;
