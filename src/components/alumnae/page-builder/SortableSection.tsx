import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SortableSectionProps {
  section: any;
  onEdit: (section: any) => void;
  onDelete: (id: string) => void;
}

export const SortableSection = ({ section, onEdit, onDelete }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!section.is_active ? 'opacity-60' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{section.title || 'Untitled Section'}</h3>
                <Badge variant="outline">{section.section_type}</Badge>
                <Badge variant="secondary">{section.layout_type}</Badge>
                {!section.is_active && (
                  <Badge variant="destructive" className="gap-1">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(section)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(section.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Height: {section.row_height || 'auto'} • Order: {section.sort_order}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
