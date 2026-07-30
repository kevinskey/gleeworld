// Seating Charts landing page. Filters, search, cards, create button.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Armchair, Plus, Search, Copy, Archive, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSeatingCharts } from '@/hooks/useSeatingCharts';
import { getTemplate, CATEGORY_LABELS } from '@/features/seating-charts/templates';
import { generateTemplate } from '@/features/seating-charts/templates';
import { CreateChartDialog } from './CreateChartDialog';
import type { SeatingChart } from '@/types/seatingCharts';

type Filter = 'all' | 'choir' | 'band' | 'orchestra' | 'classroom' | 'stage_plot' | 'archived' | 'mine';

function templateCategory(chart: SeatingChart): string {
  const t = chart.template_key ? getTemplate(chart.template_key) : null;
  if (t) return CATEGORY_LABELS[t.category];
  if (chart.chart_mode === 'classroom') return 'Classroom';
  if (chart.chart_mode === 'stage_plot') return 'Stage Plot';
  return 'Seating';
}

export function SeatingChartsDashboardPage() {
  const nav = useNavigate();
  const { charts, loading, create, duplicate, archive, remove } = useSeatingCharts();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return charts.filter((c) => {
      if (filter === 'archived' && c.status !== 'archived') return false;
      if (filter !== 'archived' && c.status === 'archived') return false;
      if (filter !== 'all' && filter !== 'archived' && filter !== 'mine') {
        const t = c.template_key ? getTemplate(c.template_key) : null;
        if (!t) return false;
        if (filter === 'stage_plot' && c.chart_mode !== 'stage_plot') return false;
        if (filter !== 'stage_plot' && t.category !== filter) return false;
      }
      if (q && !c.name.toLowerCase().includes(q) && !(c.description ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [charts, filter, query]);

  async function handleCreate(input: { name: string; description: string; template_key: string; chart_mode: any }) {
    const spec = generateTemplate(input.template_key) ?? undefined;
    const created = await create({
      name: input.name,
      description: input.description,
      chart_mode: input.chart_mode,
      template_key: input.template_key,
      template: spec,
    });
    setDialogOpen(false);
    if (created) nav(`/seating-charts/${created.id}/edit`);
  }

  return (
    <DashboardPageShell
      title="Seating Charts"
      icon={Armchair}
      subtitle="Build, share, and print seating charts for performances, rehearsals, and classrooms."
      actions={
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create chart
        </Button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="choir">Choir</TabsTrigger>
            <TabsTrigger value="band">Band</TabsTrigger>
            <TabsTrigger value="orchestra">Orchestra</TabsTrigger>
            <TabsTrigger value="classroom">Classroom</TabsTrigger>
            <TabsTrigger value="stage_plot">Stage plots</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search charts"
            className="pl-8 h-9 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading charts…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {charts.length === 0 ? 'No charts yet — create your first one.' : 'No charts match this filter.'}
          </p>
          {charts.length === 0 && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create your first chart
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="group">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">
                      <Link to={`/seating-charts/${c.id}/edit`} className="hover:text-primary">
                        {c.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {c.description ?? 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{templateCategory(c)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated {new Date(c.updated_at).toLocaleDateString()}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicate(c.id)} title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => archive(c.id, c.status !== 'archived')} title="Archive">
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    if (confirm(`Delete "${c.name}"? This cannot be undone.`)) remove(c.id);
                  }} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateChartDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </DashboardPageShell>
  );
}

export default SeatingChartsDashboardPage;
