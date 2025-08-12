import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, FileText, ArrowRight, Music2, X } from "lucide-react";
import { PDFViewer } from "@/components/PDFViewer";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [triedList, setTriedList] = useState(false);
  const [showAudioDock, setShowAudioDock] = useState(true);

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

  // Resolve audition PDF URL from Sheet Music bucket
  useEffect(() => {
    let isMounted = true;

    const toStoragePath = (url: string) => {
      try {
        if (url.includes('/storage/v1/object/')) {
          const after = url.split('/storage/v1/object/')[1];
          const parts = after.split('/');
          const isWrapped = parts[0] === 'public' || parts[0] === 'sign';
          const bucket = isWrapped ? parts[1] : parts[0];
          const pathParts = isWrapped ? parts.slice(2) : parts.slice(1);
          const path = pathParts.join('/').split('?')[0];
          return `${bucket}/${path}`; // e.g. sheet-music/pdfs/file.pdf
        }
      } catch {}
      return url; // Already a path or external URL
    };

    const loadFromLibrary = async () => {
      try {
        // Find "Come Thou Fount" in gw_sheet_music
        const { data, error } = await supabase
          .from('gw_sheet_music')
          .select('id, title, pdf_url')
          .ilike('title', '%come%thou%fount%')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) console.warn('AuditionerDashboard: sheet music query warning', error);
        if (data?.pdf_url) {
          const normalized = toStoragePath(data.pdf_url);
          if (isMounted) setPdfUrl(normalized);
          return true;
        }
        return false;
      } catch (e) {
        console.error('AuditionerDashboard: sheet music query error', e);
        return false;
      }
    };

    const run = async () => {
      let foundViaDb = await loadFromLibrary();
      if (!foundViaDb) {
        // Fallback: try common folders in sheet-music bucket (may be private)
        const candidateNames = ['come-thou-fount.pdf', 'Come_Thou_Fount.pdf', 'ComeThouFount.pdf'];
        const folders = ['', 'pdfs', 'scores', 'auditions'];
        try {
          // First try exact names
          for (const folder of folders) {
            for (const name of candidateNames) {
              const path = folder ? `${folder}/${name}` : name;
              const { data } = supabase.storage.from('sheet-music').getPublicUrl(path);
              const url = data?.publicUrl;
              if (!url) continue;
              try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) { if (isMounted) setPdfUrl(`sheet-music/${path}`); console.log('AuditionerDashboard: using sheet-music', path); return; }
              } catch {}
            }
          }
          // Then list a couple of folders to find a match (will fail if bucket is private for anon)
          for (const folder of folders) {
            const { data: list, error } = await supabase.storage.from('sheet-music').list(folder, { limit: 100 });
            if (error || !list) continue;
            const match = list.find((f: any) => f?.name?.toLowerCase().includes('come') && f?.name?.toLowerCase().includes('fount') && f?.name?.endsWith('.pdf'));
            if (match) { if (isMounted) setPdfUrl(`sheet-music/${folder ? folder + '/' : ''}${match.name}`); console.log('AuditionerDashboard: found via list in sheet-music', match.name); return; }
          }
        } catch (e) {
          console.warn('AuditionerDashboard: sheet-music fallback search failed', e);
        }
      }

      // Final fallback: public audition-docs bucket with common filenames
      try {
        const publicCandidates = ['come-thou-fount.pdf', 'Come_Thou_Fount.pdf', 'Come-Thu-Fount.pdf', 'ComeThouFount.pdf'];
        for (const name of publicCandidates) {
          const { data } = supabase.storage.from('audition-docs').getPublicUrl(name);
          const url = data?.publicUrl;
          if (!url) continue;
          try {
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) { if (isMounted) setPdfUrl(`audition-docs/${name}`); console.log('AuditionerDashboard: using audition-docs', name); return; }
          } catch {}
        }
      } catch (e) {
        console.warn('AuditionerDashboard: audition-docs fallback failed', e);
      }
    };

    run();
    return () => { isMounted = false; };
  }, []);


  const handleStartManage = async () => {
    if (!user?.id || (user as any).id === 'guest') {
      navigate('/auditions');
      return;
    }
    if (application) {
      setShowSummary(true);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
        setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      } else {
        navigate('/auditions');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-28">
      <header className="w-full sm:container mx-auto px-0 sm:px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
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

      <main className="w-full sm:container mx-auto px-0 sm:px-4 pb-12 space-y-0 sm:space-y-6">
        {showSummary && application && (
          <section ref={summaryRef} aria-labelledby="your-application" className="animate-fade-in scroll-mt-24 sm:scroll-mt-28 sticky top-14 sm:top-20 z-40">
            <Card className="shadow-lg">
              <CardContent className="pt-6 max-h-[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-7rem)] overflow-auto">
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
                        <span className="font-medium">Audition time:</span> {format(new Date(application.audition_time_slot), 'h:mm a, MMM d, yyyy')}
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

              {/* Sticky audio player so users can listen while scrolling the score */}
              <div className="sticky top-0 z-10 -mt-6 mb-4 px-4 sm:px-6 py-3 border-b border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <label htmlFor="audition-audio" className="sr-only">Audio player: Come Thou Fount</label>
                <audio
                  id="audition-audio"
                  className="w-full"
                  controls
                  preload="none"
                  src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/service-images/4e6c2ec0-1f83-449a-a984-8920f6056ab5/20250811-899174f9-2d52-4ef7-96b3-87a77127e18e-come-thou-font-of-every-blessing---audition.mp3"
                  aria-label="Play Come Thou Fount audition track"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>

              <PDFViewer pdfUrl={pdfUrl} className="border-0 shadow-none" />
              <p className="mt-3 text-xs text-muted-foreground">Tip: Press play and scroll the score. Audio continues while you view the PDF.</p>
            </CardContent>
          </Card>
        </section>
      </main>

      {showAudioDock && (
        <aside
          role="complementary"
          aria-label="Audition audio player"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-lg"
        >
          <div className="container mx-auto px-4 py-2 flex items-center gap-3">
            <div className="hidden sm:block p-2 rounded-md bg-primary/10 text-primary">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Audition Track</p>
              <p className="text-xs sm:text-sm font-medium truncate">Come Thou Fount — Audition Edition</p>
            </div>
            <audio
              controls
              preload="none"
              className="w-full max-w-[400px] sm:max-w-[520px]"
              src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/service-images/4e6c2ec0-1f83-449a-a984-8920f6056ab5/20250811-899174f9-2d52-4ef7-96b3-87a77127e18e-come-thou-font-of-every-blessing---audition.mp3"
              aria-label="Play Come Thou Fount audition track"
            >
              Your browser does not support the audio element.
            </audio>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Hide audio player"
              onClick={() => setShowAudioDock(false)}
              className="ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
};
