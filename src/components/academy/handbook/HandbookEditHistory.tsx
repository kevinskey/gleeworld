import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, User, FileText, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { HandbookEditLog } from '@/hooks/useHandbookEdit';
import { cn } from '@/lib/utils';

interface HandbookEditHistoryProps {
  editLogs: HandbookEditLog[];
  loading: boolean;
  onSectionClick?: (sectionId: string) => void;
  currentSectionId?: string;
}

export const HandbookEditHistory: React.FC<HandbookEditHistoryProps> = ({
  editLogs,
  loading,
  onSectionClick,
  currentSectionId
}) => {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (editLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <History className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">No edit history yet</p>
        <p className="text-sm mt-1">Edits made to the handbook will appear here</p>
      </div>
    );
  }

  // Group by date
  const groupedLogs = editLogs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, HandbookEditLog[]>);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(groupedLogs).map(([date, logs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="space-y-3">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => onSectionClick?.(log.section_id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    log.section_id === currentSectionId
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-primary/10 flex-shrink-0 mt-0.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{log.section_title}</p>
                      {log.edit_summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {log.edit_summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{log.editor_name}</span>
                        </div>
                        {log.editor_role && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {log.editor_role}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default HandbookEditHistory;
