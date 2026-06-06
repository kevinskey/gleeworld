// /admin/students — searchable roster. Click a row to open detail.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, ChevronRight, Loader2 } from 'lucide-react';

export default function StudentsList() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-list', q],
    queryFn: async () => {
      let query = supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part, phone')
        .eq('role', 'student')
        .order('full_name', { ascending: true })
        .limit(500);
      if (q.trim()) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Students
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Roster, parent contacts, notes, uniforms, instruments, permission slips.</p>
        </div>
        <Button onClick={() => navigate('/admin/students/onboard')}>Onboard students</Button>
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="max-w-md"
      />

      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading && <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!isLoading && students.length === 0 && <div className="p-6 text-muted-foreground">No students found.</div>}
          {students.map((s: any) => (
            <button
              key={s.user_id}
              onClick={() => navigate(`/admin/students/${s.user_id}`)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50"
            >
              <div>
                <div className="font-semibold">{s.full_name || s.email}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.email, s.voice_part, s.phone].filter(Boolean).join(' · ')}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
