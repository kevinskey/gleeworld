import { ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RepertoireItem } from '@/lib/repertoire/api';
import { RepertoireAudioPreview } from './RepertoireAudioPreview';

interface Props {
  item: RepertoireItem;
  onAddToMyMusic?: (item: RepertoireItem) => void;
  onAddToTenant?: (item: RepertoireItem) => void;
}

export function RepertoireResultCard({ item, onAddToMyMusic, onAddToTenant }: Props) {
  const sourceLabel =
    item.source === 'cpdl' ? 'CPDL' :
    item.source === 'imslp' ? 'IMSLP' :
    item.source;

  return (
    <Card className="bg-card">
      <CardContent className="p-4 flex gap-4">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-16 h-20 object-cover rounded border"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {sourceLabel}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate">{item.title}</h3>
              {item.composer && (
                <p className="text-xs text-muted-foreground truncate">{item.composer}</p>
              )}
            </div>
            {item.editors_choice && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Editor's Pick
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {item.voicing && <Badge variant="outline" className="text-xs">{item.voicing}</Badge>}
            {item.ensemble_type && <Badge variant="outline" className="text-xs">{item.ensemble_type}</Badge>}
            {item.language && <Badge variant="outline" className="text-xs">{item.language}</Badge>}
            {item.publisher && <Badge variant="outline" className="text-xs">{item.publisher}</Badge>}
            <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
            {item.audio_preview_url ? (
              <RepertoireAudioPreview url={item.audio_preview_url} ownerId={item.id} />
            ) : (
              <span className="text-xs text-muted-foreground">No audio preview</span>
            )}

            <div className="flex items-center gap-1">
              {onAddToMyMusic && (
                <Button size="sm" variant="outline" onClick={() => onAddToMyMusic(item)}>
                  Add to My Music
                </Button>
              )}
              {onAddToTenant && (
                <Button size="sm" onClick={() => onAddToTenant(item)}>
                  Add to Library
                </Button>
              )}
              <a
                href={item.affiliate_url || item.product_url || item.source_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-1"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {item.attribution && (
            <p className="text-[10px] text-muted-foreground mt-2 truncate">{item.attribution}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
