import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { StoreScoreGrid } from '@/components/store/StoreScoreGrid';
import { useStoreScores } from '@/lib/store/api';

export default function StorePage() {
  const { data: scores, isLoading } = useStoreScores();

  return (
    <DashboardPageShell
      title="GW Sheet Music Store"
      subtitle="Buy sheet music directly from independent composers and publishers."
      maxWidth="6xl"
    >
      {isLoading && <p className="text-sm text-slate-600">Loading…</p>}
      {scores && scores.length === 0 && (
        <p className="text-sm text-slate-600">No scores in the store yet. Composers publish scores from their portal.</p>
      )}
      {scores && scores.length > 0 && <StoreScoreGrid scores={scores} />}
    </DashboardPageShell>
  );
}
