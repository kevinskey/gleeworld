import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PanelId, WorshipAidSettings } from '@/lib/liturgy/worshipAid';
import { PANEL_LABEL } from './aidView';

const PANELS: PanelId[] = ['front', 'insideLeft', 'insideRight', 'back'];

/** Collapsed by default; the block list above it is the primary task. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="border-t border-border pt-3">
      <summary className="cursor-pointer select-none text-sm font-semibold">{title}</summary>
      <div className="space-y-3 pt-3">{children}</div>
    </details>
  );
}

export interface AidControlRailProps {
  panel: PanelId;
  onPanelChange: (p: PanelId) => void;
  settings: WorshipAidSettings;
  onSettingsPatch: (patch: Partial<WorshipAidSettings>) => void;
  /** Rendered as-is under the block list; the page owns block editing. */
  blockList: ReactNode;
  /** Rendered inside the collapsed "Phone edition" section. */
  phoneEdition: ReactNode;
  /** Rendered under the cover fields on the Cover panel — the page owns the upload control, which closes over fileRef. */
  coverExtras?: ReactNode;
}

export function AidControlRail({
  panel, onPanelChange, settings, onSettingsPatch, blockList, phoneEdition, coverExtras,
}: AidControlRailProps) {
  // Ids are per-instance, not hard-coded. The rail is rendered as a desktop
  // column at one viewport and as a drawer at another, and a future layout
  // that shows both at once would otherwise put two `#aid-title` nodes in the
  // document — duplicate ids silently break every `<Label htmlFor>` pairing
  // and assistive-tech association. useId makes that structurally impossible
  // rather than something a test has to keep watch over.
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 print:hidden">
      <div className="flex flex-wrap gap-1.5">
        {PANELS.map((p) => (
          <Button key={p} type="button" size="sm"
            variant={panel === p ? 'default' : 'outline'}
            className="text-xs"
            onClick={() => onPanelChange(p)}>
            {PANEL_LABEL[p]}
          </Button>
        ))}
      </div>

      {panel === 'front' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={fieldId('title')} className="text-xs">Cover title</Label>
            <Input id={fieldId('title')} value={settings.coverTitle}
              onChange={(e) => onSettingsPatch({ coverTitle: e.target.value })}
              placeholder="Your parish or ensemble name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fieldId('spine')} className="text-xs">Spine text (runs up the back cover)</Label>
            <Input id={fieldId('spine')} value={settings.spineText}
              onChange={(e) => onSettingsPatch({ spineText: e.target.value })}
              placeholder="www.yourparish.org" />
          </div>
          {coverExtras}
        </div>
      ) : (
        blockList
      )}

      <Section title="Notices">
        {([
          ['welcomeNotice', 'Welcome notice'],
          ['communionNotice', 'Communion notice'],
          ['sendingNotice', 'Sending notice'],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={fieldId(key)} className="text-xs">{label}</Label>
            <Textarea id={fieldId(key)} rows={4} value={settings[key]}
              onChange={(e) => onSettingsPatch({ [key]: e.target.value } as Partial<WorshipAidSettings>)} />
          </div>
        ))}
      </Section>

      <Section title="Phone edition">{phoneEdition}</Section>

      <Section title="Printing">
        <p className="text-xs text-muted-foreground">
          One landscape sheet, printed both sides and folded once. In the print dialog choose
          <strong> two-sided, flip on short edge</strong>, paper <strong>11 × 8.5 landscape</strong>,
          and scale <strong>100% / Actual size</strong> — any “fit to page” shifts the fold.
        </p>
      </Section>
    </div>
  );
}
