import React, { useState, useRef, useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Edit, Eye, Calendar } from 'lucide-react';
import { GleeWorldEvent } from '@/hooks/useGleeWorldEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventContextMenuProps {
  event: GleeWorldEvent;
  children: React.ReactNode;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeleted?: () => void;
}

export const EventContextMenu: React.FC<EventContextMenuProps> = ({
  event,
  children,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDeleted,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success(`"${event.title}" deleted`);
      onDeleted?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Long press handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canDelete && !canEdit) return;
    
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowContextMenu(true);
      // Prevent default click behavior after long press
      e.preventDefault();
    }, 500); // 500ms long press
  }, [canDelete, canEdit]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onContextMenu={(e) => {
              if (!canDelete && !canEdit) {
                e.preventDefault();
              }
            }}
          >
            {children}
          </div>
        </ContextMenuTrigger>
        
        {(canEdit || canDelete) && (
          <ContextMenuContent className="w-48">
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b border-border mb-1">
              <div className="truncate">{event.title}</div>
              <div className="text-xs font-normal">
                {format(new Date(event.start_date), 'MMM d, yyyy')}
              </div>
            </div>
            
            <ContextMenuItem onClick={onView} className="gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </ContextMenuItem>
            
            {canEdit && (
              <ContextMenuItem onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Event
              </ContextMenuItem>
            )}
            
            {canDelete && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>

      {/* Mobile long-press menu simulation */}
      {showContextMenu && (canEdit || canDelete) && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowContextMenu(false)}
        >
          <div
            className="absolute bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[180px]"
            style={{
              left: Math.min(contextMenuPosition.x, window.innerWidth - 200),
              top: Math.min(contextMenuPosition.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b border-border mb-1">
              <div className="truncate">{event.title}</div>
              <div className="text-xs font-normal">
                {format(new Date(event.start_date), 'MMM d, yyyy')}
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowContextMenu(false);
                onView();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
            >
              <Eye className="h-4 w-4" />
              View Details
            </button>
            
            {canEdit && (
              <button
                onClick={() => {
                  setShowContextMenu(false);
                  onEdit();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
              >
                <Edit className="h-4 w-4" />
                Edit Event
              </button>
            )}
            
            {canDelete && (
              <>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => {
                    setShowContextMenu(false);
                    setShowDeleteDialog(true);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-destructive/10 text-destructive text-left"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
