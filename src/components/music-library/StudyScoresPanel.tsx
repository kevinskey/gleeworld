import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Share2, FileText, Plus } from 'lucide-react';
import { useStudyScores } from '@/hooks/useStudyScores';

interface StudyScoresPanelProps {
  currentSelected?: { url: string; title: string; id?: string } | null;
  onOpenScore: (pdfUrl: string, title: string, id?: string) => void;
}

export const StudyScoresPanel: React.FC<StudyScoresPanelProps> = ({ currentSelected, onOpenScore }) => {
  const { scores, loading, creating, createFromCurrent, shareStudyScore } = useStudyScores(currentSelected);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');

  const canCreate = useMemo(() => Boolean(currentSelected?.id && currentSelected?.url), [currentSelected]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Study Scores</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canCreate || creating}
            onClick={async () => {
              const created = await createFromCurrent();
              if (created) {
                onOpenScore(created.pdf_url, created.title, created.derived_sheet_music_id);
              }
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add current
          </Button>
        </div>
        {currentSelected?.title && (
          <p className="text-xs text-muted-foreground mt-1">Current: {currentSelected.title}</p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Study Scores yet.</p>
        ) : (
          <div className="space-y-2">
            {scores.map((s) => (
              <div key={s.id} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0" />
                    <button
                      className="text-sm font-medium hover:underline truncate text-left"
                      onClick={() => onOpenScore(s.pdf_url, s.title, s.derived_sheet_music_id)}
                    >
                      {s.title}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setShareOpenId(shareOpenId === s.id ? null : s.id)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {shareOpenId === s.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Invite by email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!shareEmail) return;
                        await shareStudyScore(s.id, shareEmail, 'editor');
                        setShareEmail('');
                        setShareOpenId(null);
                      }}
                    >
                      Share
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
