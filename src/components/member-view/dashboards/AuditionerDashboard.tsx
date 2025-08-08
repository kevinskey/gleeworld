import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, FileText, ArrowRight } from "lucide-react";
import { AuditionDocuments } from "@/components/audition/AuditionDocuments";
import { supabase } from "@/integrations/supabase/client";

interface AuditionerDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const AuditionerDashboard = ({ user }: AuditionerDashboardProps) => {
  const firstName = (user?.full_name || "").split(" ")[0] || "Welcome";
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [application, setApplication] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || (user as any).id === 'guest') {
        setApplication(null);
        return;
      }
      const { data } = await supabase
        .from('audition_applications')
        .select('id, full_name, email, profile_image_url, audition_time_slot, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setApplication(data);
    };
    load();
  }, [user?.id]);

  const handleStartManage = async () => {
    if (!user?.id || (user as any).id === 'guest') {
      navigate('/auditions');
      return;
    }
    if (application) {
      setShowSummary(true);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }
    setChecking(true);
    try {
      const { data } = await supabase
        .from('audition_applications')
        .select('id, full_name, email, profile_image_url, audition_time_slot, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setApplication(data);
        setShowSummary(true);
        setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        navigate('/auditions');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="container mx-auto px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur shadow-sm p-5 sm:p-8 animate-fade-in">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
              <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Auditions: Join the Spelman College Glee Club
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                {`Hi ${firstName !== "" ? firstName : "there"}!`} Explore the required music and start or continue your application. One page. Clear steps. "To Amaze and Inspire."
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleStartManage} disabled={checking} aria-label="Start or manage your audition application">
                  {checking ? 'Checking…' : 'Start/Manage Application'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button asChild variant="outline">
                  <Link to="/about" aria-label="Learn more about the Glee Club and auditions">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-12 space-y-6">
        {showSummary && application && (
          <section ref={summaryRef} aria-labelledby="your-application" className="animate-fade-in">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {application.profile_image_url && (
                    <img
                      src={application.profile_image_url}
                      alt={`${application.full_name} audition selfie`}
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                  )}
                  <div className="space-y-1">
                    <h2 id="your-application" className="text-lg sm:text-xl font-semibold">
                      Your Audition Details
                    </h2>
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {application.full_name}
                    </p>
                    {application.email && (
                      <p className="text-sm text-muted-foreground">{application.email}</p>
                    )}
                    <p className="text-sm">
                      <span className="font-medium">Status:</span> {String(application.status).replace(/_/g, ' ')}
                    </p>
                    {application.audition_time_slot && (
                      <p className="text-sm">
                        <span className="font-medium">Audition time:</span> {new Date(application.audition_time_slot).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
        {/* PDF Viewer Section */}
        <section aria-labelledby="required-piece" className="animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 id="required-piece" className="text-lg sm:text-xl font-semibold">
                  Required Piece: Come Thou Fount — Audition Edition
                </h2>
              </div>
              <AuditionDocuments />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};
