const WHITE: Array<{ label: string; pc: number }> = [
  { label: 'C', pc: 0 }, { label: 'D', pc: 2 }, { label: 'E', pc: 4 }, { label: 'F', pc: 5 },
  { label: 'G', pc: 7 }, { label: 'A', pc: 9 }, { label: 'B', pc: 11 },
];
// black key position: index of the white key it sits after
const BLACK: Array<{ label: string; pc: number; after: number }> = [
  { label: 'C♯', pc: 1, after: 0 }, { label: 'D♯', pc: 3, after: 1 },
  { label: 'F♯', pc: 6, after: 3 }, { label: 'G♯', pc: 8, after: 4 }, { label: 'A♯', pc: 10, after: 5 },
];

type Props = {
  targetPc: number;
  chosenPc: number | null;
  onSelect: (pc: number) => void;
};

export default function KeyboardId({ targetPc, chosenPc, onSelect }: Props) {
  const answered = chosenPc !== null;
  const keyClass = (pc: number, isBlack: boolean) => {
    if (!answered) return isBlack ? 'bg-gray-900 hover:bg-gray-700' : 'bg-white hover:bg-blue-50';
    if (pc === targetPc) return 'bg-emerald-400';
    if (pc === chosenPc) return 'bg-red-400';
    return isBlack ? 'bg-gray-900' : 'bg-white';
  };

  const whiteW = 44;
  return (
    <div className="relative inline-block select-none" style={{ height: 150 }}>
      <div className="flex">
        {WHITE.map((k) => (
          <button
            key={k.pc}
            disabled={answered}
            onClick={() => onSelect(k.pc)}
            className={`border border-gray-400 rounded-b-md flex items-end justify-center pb-1 text-xs font-semibold text-gray-700 transition-colors ${keyClass(k.pc, false)}`}
            style={{ width: whiteW, height: 150 }}
          >
            {answered ? k.label : ''}
          </button>
        ))}
      </div>
      {BLACK.map((k) => (
        <button
          key={k.pc}
          disabled={answered}
          onClick={() => onSelect(k.pc)}
          className={`absolute top-0 z-10 rounded-b-md border border-gray-800 flex items-end justify-center pb-1 text-[10px] font-semibold text-white transition-colors ${keyClass(k.pc, true)}`}
          style={{ left: (k.after + 1) * whiteW - 14, width: 28, height: 92 }}
        >
          {answered ? k.label : ''}
        </button>
      ))}
    </div>
  );
}
