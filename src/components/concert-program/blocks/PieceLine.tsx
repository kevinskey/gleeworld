import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';

export function composerCredit(p: Pick<ConcertProgramPiece, 'composer' | 'arranger'>): string {
  if (p.composer && p.arranger) return `${p.composer}, arr. ${p.arranger}`;
  if (p.composer) return p.composer;
  if (p.arranger) return `arr. ${p.arranger}`;
  return '';
}

export function PieceLine({ piece }: { piece: ConcertProgramPiece }) {
  const credit = composerCredit(piece);
  return (
    <div className="cp-piece">
      <div className="cp-piece-line">
        <span className="cp-piece-title">{piece.title}</span>
        <span className="cp-leader" aria-hidden="true" />
        {credit ? <span className="cp-piece-composer">{credit}</span> : null}
      </div>
      {piece.voicing ? <div className="cp-piece-voicing">{piece.voicing}</div> : null}
      {piece.soloists ? <div className="cp-piece-soloists">{piece.soloists}</div> : null}
    </div>
  );
}
