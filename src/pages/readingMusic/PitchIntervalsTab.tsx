import { Card, CardContent } from '@/components/ui/card';
import type { Voice } from '@/lib/sightReading/generate';
import { PitchMatchTab } from '@/pages/sightReading/PitchMatchTab';

interface Props {
  voice: Voice;
  onVoiceChange: (v: Voice) => void;
}

export function PitchIntervalsTab({ voice, onVoiceChange }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <label htmlFor="pit-voice" className="text-sm text-slate-600">Voice</label>
          <select
            id="pit-voice"
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value as Voice)}
          >
            <option value="soprano">Soprano</option>
            <option value="alto">Alto</option>
            <option value="tenor">Tenor</option>
            <option value="bass">Bass</option>
          </select>
          <span className="text-xs text-slate-500">Sets and free-play modes adapt to your range.</span>
        </CardContent>
      </Card>
      <PitchMatchTab voice={voice} />
    </div>
  );
}
