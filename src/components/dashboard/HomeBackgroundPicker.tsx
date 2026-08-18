// Background-color picker for the Command Center (/dashboard home).
// A quiet palette button next to the greeting opens swatches + a custom
// color input. Custom picks are softened to a readable pastel of the chosen
// hue (see commandCenterBackground.ts for why); the swatch ring marks the
// active choice. Persists per user via useCommandCenterBackground.
import { useRef } from 'react';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  BG_SWATCHES, softenBgColor,
} from '@/lib/home/commandCenterBackground';

export function HomeBackgroundPicker({ background, onChange }: {
  background: string | null;
  onChange: (color: string | null) => Promise<void>;
}) {
  // Debounce the native color input — it fires on every drag tick, and each
  // accepted value writes a row. Only the settle (300ms quiet) persists.
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (color: string | null) => {
    void onChange(color).catch(() => {
      toast.error("Couldn't save your background color. Please try again.");
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Change background color"
          title="Background color"
        >
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-medium mb-2">Background color</p>
        <div className="grid grid-cols-5 gap-2">
          {BG_SWATCHES.map((s) => {
            const active = background === s.value;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => apply(s.value)}
                aria-label={`${s.name} background`}
                aria-pressed={active}
                title={s.name}
                className={`h-9 w-9 rounded-full border flex items-center justify-center transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'
                }`}
                // The default swatch shows the token background itself.
                style={{ backgroundColor: s.value ?? 'hsl(var(--background))' }}
              >
                {active && <Check className="w-4 h-4 text-foreground/70" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Label htmlFor="cc-bg-custom" className="text-sm text-muted-foreground">
            Custom
          </Label>
          <input
            id="cc-bg-custom"
            type="color"
            value={background ?? '#f6f4ef'}
            onChange={(e) => {
              const softened = softenBgColor(e.target.value);
              if (settleTimer.current) clearTimeout(settleTimer.current);
              settleTimer.current = setTimeout(() => apply(softened), 300);
            }}
            className="h-9 w-14 cursor-pointer border border-border bg-card p-1"
            aria-label="Pick a custom background color"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Any color works — bold picks are softened so your page stays readable.
        </p>
      </PopoverContent>
    </Popover>
  );
}
