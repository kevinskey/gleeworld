import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyStipend } from '../useStipendStanding';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

export function MyStipendCard() {
  const { standing, period, loading } = useMyStipend();

  if (loading || !standing || !period) return null;

  const earned = Number(standing.earned);
  const base = Number(standing.base_amount);
  const pct = base > 0 ? Math.round((earned / base) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="!text-sm">My stipend — {period.name}</CardTitle>
        <CardDescription className="text-xs">
          Attend every service to earn the full amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{money(earned)}</span>
          <span className="text-sm text-muted-foreground">of {money(base)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Attended</p>
            <p className="font-medium">
              {Number(standing.credited_services)} / {standing.required_services}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Absences</p>
            <p className="font-medium">{standing.absences}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Each service</p>
            <p className="font-medium">{money(Number(standing.per_service_value))}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
