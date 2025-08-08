import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const AuditionDocuments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const candidates = useMemo(
    () => [
      "come-thou-fount.pdf",
      "Come_Thou_Fount.pdf",
      "Come-Thu-Fount.pdf",
      "ComeThouFount.pdf",
    ],
    []
  );

  useEffect(() => {
    let isMounted = true;

    const resolveFirstAvailable = async () => {
      setLoading(true);
      try {
        for (const name of candidates) {
          const { data } = supabase.storage
            .from("audition-docs")
            .getPublicUrl(name);
          const url = data?.publicUrl;
          if (!url) continue;
          try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) {
              if (isMounted) setFileUrl(url);
              break;
            }
          } catch {}
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolveFirstAvailable();
    return () => {
      isMounted = false;
    };
  }, [candidates]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Come Thou Fount — Audition Edition (PDF)</CardTitle>
        <CardDescription>
          Required audition piece. Open the PDF below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking for document…</p>
        ) : fileUrl ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Come Thou Fount PDF">
                  Open PDF
                </a>
              </Button>
            </div>
            <div className="rounded-md overflow-hidden border">
              <iframe
                title="Come Thou Fount — Audition Edition"
                src={fileUrl}
                className="w-full h-[70vh]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The PDF isn’t available yet. We’ll add “Come Thou Fount — Audition Edition” here shortly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
