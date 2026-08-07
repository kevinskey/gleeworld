import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft } from 'lucide-react';
import { useStipendPeriods } from '../useStipendPeriods';
import { StipendPeriodForm } from './StipendPeriodForm';
import { StipendPolicyEditor } from './StipendPolicyEditor';
import { StipendRoster } from './StipendRoster';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function StipendPeriodsPanel() {
  const { periods, loading, error, createPeriod, updatePeriod, closePeriod } = useStipendPeriods();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const current = periods.find((p) => p.id === selected) ?? null;

  if (current) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> All periods
        </Button>
        <StipendRoster
          period={current}
          // closePeriod resolves with a close summary; the roster only needs
          // to know it finished, and errors still propagate to the dialog.
          onClose={async () => { await closePeriod(current.id); }}
          onActivate={() => updatePeriod(current.id, { status: 'active' })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stipend periods</h3>
          <p className="text-sm text-muted-foreground">
            Set the stipend and how many services earn it. Attendance does the rest.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New period
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && periods.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No stipend periods yet. Create one to link attendance to stipends.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 auto-rows-max">
        {periods.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/40"
            onClick={() => setSelected(p.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="!text-sm">{p.name}</CardTitle>
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                  {p.status}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {p.starts_on} – {p.ends_on}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {money(p.default_amount)} over {p.required_services} services ·{' '}
              {money(p.default_amount / Math.max(p.required_services, 1))} each
            </CardContent>
          </Card>
        ))}
      </div>

      <StipendPolicyEditor />

      <StipendPeriodForm open={formOpen} onOpenChange={setFormOpen}
        onSubmit={async (input) => { await createPeriod(input); }} />
    </div>
  );
}
