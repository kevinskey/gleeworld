// Overlay panel that slides over the canvas next to the rail (md+ only;
// phones use bottom Sheets instead). The canvas never reflows — the flyout
// is absolutely positioned inside the editor body.
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorFlyoutProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function EditorFlyout({ title, onClose, children }: EditorFlyoutProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-y-0 left-0 z-20 w-72 max-w-[80vw] bg-card border-r shadow-lg flex flex-col print:hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label={`Close ${title}`}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default EditorFlyout;
