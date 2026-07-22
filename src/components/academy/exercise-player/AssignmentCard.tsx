import { ClipboardList } from 'lucide-react';
import type { ParsedExercise } from './parseExercise';

export function AssignmentCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'assignment' }>; title: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground/85">
        {ex.instructions.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Submit</div>
        <ul className="list-disc ml-5 space-y-0.5 text-sm text-foreground/85">
          {ex.deliverables.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Grading</div>
        <div className="w-full overflow-x-auto">
          <table className="text-sm w-full max-w-sm">
            <tbody>
              {ex.rubric.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1 text-foreground/85">{r.criterion}</td>
                  <td className="py-1 text-right text-muted-foreground">{r.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
