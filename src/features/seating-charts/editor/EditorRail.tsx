// Slim tool rail for the seating chart editor. Vertical on md+ (left edge),
// horizontal on phones (bottom bar). Panels open as flyouts/sheets owned by
// EditorPage; the rail only reports which item was pressed.
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type RailItemKey = 'people' | 'objects' | 'properties' | 'autoplace' | 'groups' | 'share';

export interface RailItem {
  key: RailItemKey;
  icon: LucideIcon;
  label: string;
  /** Rendered as a count pill on the icon (e.g. current selection size). */
  badge?: number;
  /** Draw a divider above this item. */
  dividerBefore?: boolean;
}

interface EditorRailProps {
  items: RailItem[];
  activeKey: RailItemKey | null;
  onSelect: (key: RailItemKey) => void;
  /** Extra self-contained popover tools (e.g. Attendance) rendered after items. */
  children?: React.ReactNode;
}

export function EditorRail({ items, activeKey, onSelect, children }: EditorRailProps) {
  return (
    <nav
      className="flex md:flex-col items-center gap-1 bg-card border-t md:border-t-0 md:border-r px-1 py-1 md:px-1 md:py-2 shrink-0 print:hidden"
      aria-label="Editor tools"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeKey === item.key;
        return (
          <div key={item.key} className={item.dividerBefore ? 'md:pt-2 md:mt-1 md:border-t md:w-full flex md:justify-center' : 'flex md:justify-center md:w-full'}>
            <Button
              variant="ghost"
              size="icon"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => onSelect(item.key)}
              className={`relative h-11 w-11 ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-xs leading-none px-1 py-0.5 min-w-4 text-center">
                  {item.badge}
                </span>
              )}
            </Button>
          </div>
        );
      })}
      {children}
    </nav>
  );
}

export default EditorRail;
