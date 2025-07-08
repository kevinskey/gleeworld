import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Users, 
  ExternalLink, 
  Calendar,
  CheckSquare,
  AlertTriangle
} from "lucide-react";

interface AssignedDuty {
  id: string;
  userId: string;
  userName: string;
  task: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface AmazonLink {
  id: string;
  url: string;
  title: string;
  description?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  alt: string;
}

interface ContentViewerProps {
  content: {
    text: string;
    images: UploadedImage[];
    amazonLinks: AmazonLink[];
    assignedDuties: AssignedDuty[];
  };
  showTitle?: boolean;
  title?: string;
  onDutyComplete?: (dutyId: string) => void;
}

export const ContentViewer = ({ 
  content, 
  showTitle = true, 
  title = "Content", 
  onDutyComplete 
}: ContentViewerProps) => {
  const formatText = (text: string) => {
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/\n/g, '<br />');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <CheckSquare className="h-3 w-3" />;
      case 'low': return <CheckSquare className="h-3 w-3" />;
      default: return <CheckSquare className="h-3 w-3" />;
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card className="w-full">
      {showTitle && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        {/* Main Text Content */}
        {content.text && (
          <div className="prose prose-sm max-w-none">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: formatText(content.text) 
              }}
              className="text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Images */}
        {content.images.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <img className="h-4 w-4" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' /%3E%3C/svg%3E" alt="" />
              Images ({content.images.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {content.images.map((image) => (
                <div key={image.id} className="space-y-1">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-24 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => window.open(image.url, '_blank')}
                  />
                  <p className="text-xs text-muted-foreground truncate">{image.alt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amazon Links */}
        {content.amazonLinks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              Amazon Products ({content.amazonLinks.length})
            </h4>
            <div className="space-y-3">
              {content.amazonLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <h5 className="font-medium text-sm truncate">{link.title}</h5>
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                      )}
                      <p className="text-xs text-blue-600 truncate">{link.url}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Duties */}
        {content.assignedDuties.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Assigned Duties ({content.assignedDuties.length})
            </h4>
            <div className="space-y-3">
              {content.assignedDuties.map((duty) => (
                <div key={duty.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-sm">{duty.userName}</span>
                        <Badge 
                          variant={getPriorityColor(duty.priority)} 
                          className="text-xs flex items-center gap-1"
                        >
                          {getPriorityIcon(duty.priority)}
                          {duty.priority}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{duty.task}</p>
                      {duty.dueDate && (
                        <div className={`flex items-center gap-1 text-xs ${
                          isOverdue(duty.dueDate) ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          <span>
                            Due: {new Date(duty.dueDate).toLocaleDateString()}
                            {isOverdue(duty.dueDate) && ' (Overdue)'}
                          </span>
                        </div>
                      )}
                    </div>
                    {onDutyComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDutyComplete(duty.id)}
                        className="flex-shrink-0"
                      >
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!content.text && 
         content.images.length === 0 && 
         content.amazonLinks.length === 0 && 
         content.assignedDuties.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No content available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};