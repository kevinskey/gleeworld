import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableFileItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const DraggableFileItem = ({ id, children, disabled = false }: DraggableFileItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id,
    disabled 
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
    >
      {children}
    </div>
  );
};
