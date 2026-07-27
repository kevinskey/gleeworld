interface Props {
  percent: number;    // 0..100
  size?: number;      // outer diameter in px, default 64
  label?: string;     // small text under the ring; often the percentage
}

// Mastery ring: two concentric SVG circles. The foreground uses
// stroke-dasharray to draw a partial arc equal to `percent`. Amber
// accent when fully mastered (100%) to reward the completion, slate
// otherwise.
export function MasteryRing({ percent, size = 64, label }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const complete = clamped >= 100;
  const strokeColor = complete ? '#f59e0b' : '#0f172a';

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={strokeColor} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label && <span className="text-xs mt-1 text-slate-600">{label}</span>}
    </div>
  );
}
