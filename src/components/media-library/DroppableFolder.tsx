import { useDroppable } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DroppableFolderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onNativeFileDrop?: (files: File[], folderId: string) => void;
}

export const DroppableFolder = ({ id, children, className, onNativeFileDrop }: DroppableFolderProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const [nativeDragOver, setNativeDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only handle native file drops (not @dnd-kit internal drags)
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setNativeDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNativeDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files') && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setNativeDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      onNativeFileDrop?.(files, id);
    }
  }, [id, onNativeFileDrop]);

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "transition-all duration-200",
        (isOver || nativeDragOver) && "bg-primary/20 ring-2 ring-primary rounded-md scale-105",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};
