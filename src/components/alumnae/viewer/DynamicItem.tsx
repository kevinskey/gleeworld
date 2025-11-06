import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DynamicItemProps {
  item: any;
}

export const DynamicItem = ({ item }: DynamicItemProps) => {
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (!item.link_url) return;

    if (item.link_target === 'external') {
      window.open(item.link_url, '_blank');
    } else {
      navigate(item.link_url);
    }
  };

  const renderContent = () => {
    switch (item.item_type) {
      case 'text':
        return (
          <div className="prose prose-sm max-w-none">
            {item.title && <h3 className="text-xl font-semibold mb-3">{item.title}</h3>}
            <p className="whitespace-pre-wrap">{item.content}</p>
          </div>
        );

      case 'image':
        return (
          <div>
            {item.title && <h3 className="text-xl font-semibold mb-3">{item.title}</h3>}
            {item.media_url ? (
              <div className="w-full aspect-video rounded-lg shadow-md overflow-hidden">
                <img
                  src={item.media_url}
                  alt={item.title || 'Image'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-muted rounded-lg shadow-md flex items-center justify-center">
                <p className="text-muted-foreground">No image uploaded</p>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div>
            {item.title && <h3 className="text-xl font-semibold mb-3">{item.title}</h3>}
            <video controls className="w-full rounded-lg shadow-md">
              <source src={item.media_url} />
            </video>
          </div>
        );

      case 'audio':
        return (
          <Card className="p-4">
            {item.title && <h3 className="text-lg font-semibold mb-3">{item.title}</h3>}
            <audio controls className="w-full">
              <source src={item.media_url} type="audio/mpeg" />
            </audio>
          </Card>
        );

      case 'pdf':
        return (
          <Card className="p-4">
            {item.title && <h3 className="text-lg font-semibold mb-3">{item.title}</h3>}
            <Button asChild className="w-full">
              <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                View PDF
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </Card>
        );

      case 'link':
        return (
          <Card className="p-4">
            {item.title && <h3 className="text-lg font-semibold mb-3">{item.title}</h3>}
            {item.content && <p className="text-sm text-muted-foreground mb-3">{item.content}</p>}
            <Button onClick={handleLinkClick} className="w-full">
              {item.title || 'Visit Link'}
              {item.link_target === 'external' && <ExternalLink className="h-4 w-4 ml-2" />}
            </Button>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: `${item.width_percentage}%` }} className="min-w-0">
      {renderContent()}
    </div>
  );
};
