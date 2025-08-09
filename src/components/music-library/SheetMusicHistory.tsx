import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NotebookPen, PencilRuler, Link as LinkIcon, Calendar, Clock } from 'lucide-react'

interface SheetMusicHistoryProps {
  musicId: string
}

type HistoryItem = {
  id: string
  kind: 'annotation' | 'note' | 'rehearsal'
  title: string
  subtitle?: string
  date: string
  extra?: string
}

export function SheetMusicHistory({ musicId }: SheetMusicHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<HistoryItem[]>([])

  useEffect(() => {
    let active = true
    const fetchAll = async () => {
      setLoading(true)
      try {
        // Annotations
        const { data: ann, error: annErr } = await supabase
          .from('gw_sheet_music_annotations')
          .select('id, created_at, annotation_type, page_number')
          .eq('sheet_music_id', musicId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (annErr) throw annErr

        // Notes
        const { data: notes, error: notesErr } = await supabase
          .from('gw_sheet_music_notes')
          .select('id, created_at, title, note_type')
          .eq('music_id', musicId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (notesErr) throw notesErr

        // Rehearsal links (with event)
        const { data: links, error: linksErr } = await supabase
          .from('gw_rehearsal_music_links')
          .select('id, created_at, notes, gw_events(id, title, start_date)')
          .eq('music_id', musicId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (linksErr) throw linksErr

        const mapped: HistoryItem[] = [
          ...(ann || []).map((a: any) => ({
            id: a.id,
            kind: 'annotation' as const,
            title: `Annotation on page ${a.page_number}`,
            subtitle: a.annotation_type?.replace('_', ' '),
            date: a.created_at,
          })),
          ...(notes || []).map((n: any) => ({
            id: n.id,
            kind: 'note' as const,
            title: n.title || 'Note',
            subtitle: n.note_type?.replace('_', ' '),
            date: n.created_at,
          })),
          ...(links || []).map((l: any) => ({
            id: l.id,
            kind: 'rehearsal' as const,
            title: l.gw_events?.title || 'Rehearsal linked',
            subtitle: 'Practice link',
            date: l.created_at,
            extra: l.gw_events?.start_date,
          })),
        ]

        const sorted = mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25)
        if (active) setItems(sorted)
      } catch (e) {
        console.error('Failed to load history', e)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAll()
    return () => { active = false }
  }, [musicId])

  const iconFor = (kind: HistoryItem['kind']) => {
    switch (kind) {
      case 'annotation':
        return <PencilRuler className="h-4 w-4" />
      case 'note':
        return <NotebookPen className="h-4 w-4" />
      case 'rehearsal':
        return <LinkIcon className="h-4 w-4" />
    }
  }

  const badgeVariant = (kind: HistoryItem['kind']) => {
    switch (kind) {
      case 'annotation':
        return 'outline' as const
      case 'note':
        return 'secondary' as const
      case 'rehearsal':
        return 'default' as const
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading history...</div>
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          No activity yet. Annotations, notes, and practice links will appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={`${it.kind}-${it.id}`}>
              <div className="flex items-start gap-3">
                <div className="mt-1">{iconFor(it.kind)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant(it.kind)} className="capitalize">
                      {it.kind}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(it.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-medium leading-snug break-words">{it.title}</div>
                  {it.subtitle && (
                    <div className="text-sm text-muted-foreground">{it.subtitle}</div>
                  )}
                  {it.extra && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Event: {new Date(it.extra).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              {idx < items.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
