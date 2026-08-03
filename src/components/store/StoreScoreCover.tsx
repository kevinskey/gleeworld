// Product cover for a store score. Resolution order:
//   1. thumbnail path ending in .pdf → rasterize page 1 via PDFThumbnail
//   2. image path → <img>, falling back to PDFThumbnail on load error
//      (covers postprocess writing a PDF under an image extension)
//   3. no path → designed "engraved cover" placeholder (never bare text)
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PDFThumbnail } from '@/components/music-library/PDFThumbnail';
import { cn } from '@/lib/utils';
import type { StoreScoreRow } from '@/lib/store/api';

const ASSETS_BUCKET = 'partner-assets';

interface Props {
  score: Pick<StoreScoreRow, 'title' | 'composer' | 'voicing' | 'thumbnail_storage_path'>;
  className?: string;
}

export function StoreScoreCover({ score, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const path = score.thumbnail_storage_path;
  const publicUrl = path
    ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl
    : null;
  const isPdf = !!path && /\.pdf$/i.test(path);
  const root = cn('aspect-[3/4] overflow-hidden bg-background', className);

  if (publicUrl && (isPdf || imgFailed)) {
    return (
      <div className={root}>
        <PDFThumbnail bare pdfUrl={publicUrl} alt={score.title} className="w-full h-full" />
      </div>
    );
  }

  if (publicUrl) {
    return (
      <div className={root}>
        <img
          src={publicUrl}
          alt={score.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(root, 'relative border-t-4 border-primary')}>
      <div className="flex h-full flex-col items-center justify-center px-4 py-6 text-center">
        <p className="font-semibold text-sm line-clamp-3">{score.title}</p>
        {score.composer && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{score.composer}</p>
        )}
      </div>
      {score.voicing && (
        <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {score.voicing}
        </span>
      )}
    </div>
  );
}
