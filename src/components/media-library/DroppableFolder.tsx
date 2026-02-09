import { useDroppable } from '@dnd-kit/core';
import { useState, useCallback, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // Use native addEventListener to ensure we capture events before @dnd-kit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        setNativeDragOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setNativeDragOver(false);
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files') && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setNativeDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        onNativeFileDrop?.(files, id);
      }
    };

    // Use capture phase to intercept before @dnd-kit
    el.addEventListener('dragenter', handleDragEnter, true);
    el.addEventListener('dragover', handleDragOver, true);
    el.addEventListener('dragleave', handleDragLeave, true);
    el.addEventListener('drop', handleDrop, true);

    return () => {
      el.removeEventListener('dragenter', handleDragEnter, true);
      el.removeEventListener('dragover', handleDragOver, true);
      el.removeEventListener('dragleave', handleDragLeave, true);
      el.removeEventListener('drop', handleDrop, true);
    };
  }, [id, onNativeFileDrop]);

  // Merge refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    (containerRef as any).current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  return (
    <div 
      ref={setRefs}
      className={cn(
        "transition-all duration-200",
        (isOver || nativeDragOver) && "bg-primary/20 ring-2 ring-primary rounded-md scale-105",
        className
      )}
    >
      {children}
    </div>
  );
};
