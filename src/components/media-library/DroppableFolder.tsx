import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableFolderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableFolder = ({ id, children, className }: DroppableFolderProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "transition-all duration-200",
        isOver && "bg-primary/20 ring-2 ring-primary rounded-md scale-105",
        className
      )}
    >
      {children}
    </div>
  );
};
