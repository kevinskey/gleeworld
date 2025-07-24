import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Eye, 
  Edit, 
  Package,
  Calendar,
  Clock,
  Star,
  Music2
} from "lucide-react";
import { PDFThumbnail } from "@/components/music-library/PDFThumbnail";

export interface SheetMusicItem {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  tags: string[] | null;
  pdf_url: string | null;
  audio_preview_url: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
  physical_copies_count?: number;
}

export interface FormatInfo {
  hasDigital: boolean;
  hasPhysical: boolean;
  formatType: 'digital' | 'physical' | 'both' | 'none';
}

interface SheetMusicCardProps {
  item: SheetMusicItem;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  onView: (item: SheetMusicItem) => void;
  onEdit: (item: SheetMusicItem) => void;
  onDownload: (item: SheetMusicItem) => void;
  showActions?: boolean;
}

export const getFormatInfo = (item: SheetMusicItem): FormatInfo => {
  const hasDigital = !!item.pdf_url;
  const hasPhysical = (item.physical_copies_count || 0) > 0;
  
  let formatType: 'digital' | 'physical' | 'both' | 'none' = 'none';
  if (hasDigital && hasPhysical) formatType = 'both';
  else if (hasDigital) formatType = 'digital';
  else if (hasPhysical) formatType = 'physical';
  
  return { hasDigital, hasPhysical, formatType };
};

export const getFormatBadge = (formatType: FormatInfo['formatType']) => {
  const badges = {
    digital: { label: 'Digital', variant: 'secondary' as const, icon: FileText },
    physical: { label: 'Physical', variant: 'outline' as const, icon: Package },
    both: { label: 'Both', variant: 'default' as const, icon: Star },
    none: { label: 'None', variant: 'destructive' as const, icon: Clock }
  };
  
  return badges[formatType];
};

export const SheetMusicCard = ({
  item,
  viewMode,
  isSelected = false,
  onView,
  onEdit,
  onDownload,
  showActions = true,
}: SheetMusicCardProps) => {
  const formatInfo = getFormatInfo(item);
  const badgeConfig = getFormatBadge(formatInfo.formatType);
  const IconComponent = badgeConfig.icon;

  if (viewMode === 'list') {
    return (
      <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary' : ''} hover:shadow-md`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Thumbnail */}
            <div className="w-16 h-20 flex-shrink-0">
            <PDFThumbnail
              pdfUrl={item.pdf_url}
              title={item.title}
              alt={`PDF thumbnail for ${item.title}`}
              className="w-full h-full object-cover rounded"
            />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                  {item.composer && (
                    <p className="text-sm text-muted-foreground truncate">
                      by {item.composer}
                    </p>
                  )}
                  {item.arranger && (
                    <p className="text-xs text-muted-foreground truncate">
                      arr. {item.arranger}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Badge variant={badgeConfig.variant} className="flex items-center gap-1">
                    <IconComponent className="h-3 w-3" />
                    {badgeConfig.label}
                  </Badge>
                </div>
              </div>
              
              {/* Tags and Voice Parts */}
              <div className="mt-2 flex flex-wrap gap-1">
                {item.voice_parts && item.voice_parts.map((part, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Music2 className="h-3 w-3 mr-1" />
                    {part}
                  </Badge>
                ))}
                {item.difficulty_level && (
                  <Badge variant="secondary" className="text-xs">
                    {item.difficulty_level}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions */}
            {showActions && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => onView(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {item.pdf_url && (
                  <Button variant="outline" size="sm" onClick={() => onDownload(item)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary' : ''} hover:shadow-lg cursor-pointer group`}>
      <CardHeader className="p-4 pb-2 relative">
        {/* Format Badge */}
        <div className="absolute top-2 right-2 z-10">
          <Badge variant={badgeConfig.variant} className="flex items-center gap-1">
            <IconComponent className="h-3 w-3" />
            {badgeConfig.label}
          </Badge>
        </div>
        
        {/* Thumbnail */}
        <div className="w-full h-32 mb-2">
          <PDFThumbnail
            pdfUrl={item.pdf_url}
            title={item.title}
            alt={`PDF thumbnail for ${item.title}`}
            className="w-full h-full object-cover rounded"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <CardTitle className="text-sm font-semibold line-clamp-2 mb-1">
          {item.title}
        </CardTitle>
        
        {item.composer && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            by {item.composer}
          </p>
        )}
        
        {/* Tags and Voice Parts */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.voice_parts && item.voice_parts.slice(0, 2).map((part, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              <Music2 className="h-3 w-3 mr-1" />
              {part}
            </Badge>
          ))}
          {item.voice_parts && item.voice_parts.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.voice_parts.length - 2}
            </Badge>
          )}
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="outline" size="sm" onClick={() => onView(item)}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              <Edit className="h-3 w-3" />
            </Button>
            {item.pdf_url && (
              <Button variant="outline" size="sm" onClick={() => onDownload(item)}>
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};