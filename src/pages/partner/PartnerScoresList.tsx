import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyPartnerScores } from '@/lib/partner/api';

export default function PartnerScoresList() {
  const { data: scores, isLoading } = useMyPartnerScores();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your scores</h2>
        <Button asChild size="sm">
          <Link to="/partner/scores/new"><Plus className="w-4 h-4 mr-1" /> New score</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {scores && scores.length === 0 && (
        <p className="text-sm text-muted-foreground">You haven't uploaded any scores yet.</p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {(scores ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[s.composer, s.voicing, s.ensemble_type].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs">${(s.price_cents / 100).toFixed(2)}</span>
                <Badge variant={s.status === 'published' ? 'default' : 'outline'} className="text-xs">{s.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
