import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const ASSETS_BUCKET = 'partner-assets';

interface Props {
  partnerId: string;
  currentPath: string | null;
  onUploaded: (path: string) => void;
  filenameBase?: string;
  emptyLabel?: string;
}

export function LogoUploadField({ partnerId, currentPath, onUploaded, filenameBase = 'logo', emptyLabel = 'No logo' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const publicUrl = currentPath
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(currentPath).data.publicUrl
    : null;

  const onFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Pick an image'); return; }
    const ext = file.name.split('.').pop() || 'png';
    const path = `${partnerId}/${filenameBase}.${ext}`;
    const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, file, { upsert: true });
    if (error) { toast.error(`Upload failed: ${error.message}`); return; }
    onUploaded(path);
  };

  return (
    <div className="flex items-center gap-3">
      {publicUrl ? (
        <img src={publicUrl} alt="Logo" className="w-16 h-16 rounded border object-cover" />
      ) : (
        <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">{emptyLabel}</div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>Upload</Button>
    </div>
  );
}
