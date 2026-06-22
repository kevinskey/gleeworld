// Placeholder used by Academy sub-routes that don't have their full page
// implementation yet. Keeps the shell + nav consistent while the real
// content gets built out.

import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function AcademyComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-6 py-10 max-w-4xl mx-auto">
      <Card className="border-0 rounded-2xl bg-card" style={{
        boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
      }}>
        <CardContent className="p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 inline-flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="font-semibold text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{subtitle}</p>
        </CardContent>
      </Card>
    </div>
  );
}
