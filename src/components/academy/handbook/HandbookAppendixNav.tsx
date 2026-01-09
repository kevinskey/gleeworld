import React, { useState, useEffect } from 'react';
import { FileText, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Appendix {
  id: string;
  slug: string;
  title: string;
  version: number;
}

interface HandbookAppendixNavProps {
  courseId: string;
  onSelectAppendix: (slug: string) => void;
  selectedSlug?: string;
  className?: string;
}

export const HandbookAppendixNav: React.FC<HandbookAppendixNavProps> = ({
  courseId,
  onSelectAppendix,
  selectedSlug,
  className
}) => {
  const [appendices, setAppendices] = useState<Appendix[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppendices = async () => {
      try {
        const { data, error } = await supabase
          .from('handbook_appendices')
          .select('id, slug, title, version')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('slug', { ascending: true });

        if (error) throw error;

        // Deduplicate by slug, keeping the highest version
        const uniqueAppendices = (data || []).reduce((acc, curr) => {
          const existing = acc.find(a => a.slug === curr.slug);
          if (!existing || existing.version < curr.version) {
            return [...acc.filter(a => a.slug !== curr.slug), curr];
          }
          return acc;
        }, [] as Appendix[]);

        setAppendices(uniqueAppendices);
      } catch (error) {
        console.error('Error fetching appendices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppendices();
  }, [courseId]);

  if (loading) {
    return (
      <div className={cn("py-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (appendices.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
        Appendices
      </div>
      {appendices.map((appendix) => (
        <button
          key={appendix.id}
          onClick={() => onSelectAppendix(appendix.slug)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
            selectedSlug === appendix.slug
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="truncate text-left flex-1">{appendix.title}</span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
        </button>
      ))}
    </div>
  );
};
