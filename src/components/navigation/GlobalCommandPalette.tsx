import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, Command as CommandIcon } from 'lucide-react';
import { UNIFIED_MODULES } from '@/config/unified-modules';

interface GlobalCommandPaletteProps {
  className?: string;
}

export const GlobalCommandPalette = ({ className = '' }: GlobalCommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Build searchable items from modules
  const items = useMemo(() => {
    return UNIFIED_MODULES.filter(m => m.isActive !== false).map(m => ({
      id: m.id,
      title: m.title,
      category: m.category || 'other',
      keywords: [m.name, m.title, m.description].filter(Boolean).join(' ').toLowerCase(),
      icon: m.icon,
      iconColor: (m as any).iconColor || 'primary',
    }));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Allow external trigger via custom event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler as any);
    return () => window.removeEventListener('open-command-palette', handler as any);
  }, []);

  const handleSelect = (id: string) => {
    setOpen(false);
    // Route to dashboard and request module open via query param
    navigate(`/dashboard?module=${encodeURIComponent(id)}`);
    // Also emit an event after navigation in case we're already on dashboard
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-module', { detail: { id } }));
    }, 200);
  };

  // Group by category for nicer display
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const k = it.category;
      if (!map.has(k)) map.set(k, [] as any);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries()).map(([category, list]) => ({ category, list }));
  }, [items]);

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="hidden md:flex items-center gap-2">
        <Search className="h-4 w-4" />
        <span className="text-sm">Search modules…</span>
        <span className="ml-2 hidden lg:inline-flex items-center gap-1 text-xs text-muted-foreground"><CommandIcon className="h-3 w-3" />K</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a module name or action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map(g => (
            <CommandGroup key={g.category} heading={g.category}>
              {g.list.map((it) => (
                <CommandItem key={it.id} value={`${it.title} ${it.keywords}`} onSelect={() => handleSelect(it.id)}>
                  {it.icon && (
                    <it.icon className={`mr-2 h-4 w-4 text-${it.iconColor}-600`} />
                  )}
                  <span>{it.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default GlobalCommandPalette;
