import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Youtube, Link as LinkIcon, PlusCircle } from 'lucide-react'

interface PracticeLinksProps {
  musicId: string
  voiceParts?: string[]
}

interface PracticeLink {
  id: string
  music_id: string
  owner_id: string
  visibility: 'personal' | 'section' | 'global'
  title: string
  url: string
  notes?: string | null
  target_section?: string | null
  created_at: string
}

export function PracticeLinks({ musicId, voiceParts = [] }: PracticeLinksProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [links, setLinks] = useState<PracticeLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    url: '',
    visibility: 'personal' as 'personal' | 'section' | 'global',
    target_section: ''
  })

  const canManageSectionGlobal = useMemo(() => {
    return role === 'section_leader' || role === 'admin' || role === 'super-admin'
  }, [role])

  useEffect(() => {
    fetchRole()
    fetchLinks()
  }, [musicId])

  const fetchRole = async () => {
    try {
      if (!user) return
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      setRole(data?.role ?? null)
    } catch (e) {
      console.error('Failed to fetch role', e)
    }
  }

  const fetchLinks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gw_practice_links')
        .select('*')
        .eq('music_id', musicId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setLinks((data || []) as PracticeLink[])
    } catch (e) {
      console.error('Failed to load practice links', e)
      toast({ title: 'Error', description: 'Failed to load practice links', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const youtubeLinks = useMemo(() => links.filter(l => /youtu\.be|youtube\.com/.test(l.url)), [links])
  const otherLinks = useMemo(() => links.filter(l => !/youtu\.be|youtube\.com/.test(l.url)), [links])

  const getEmbedUrl = (url: string) => {
    try {
      const u = new URL(url)
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '')
        return `https://www.youtube.com/embed/${id}`
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v')
        if (id) return `https://www.youtube.com/embed/${id}`
      }
      return null
    } catch {
      return null
    }
  }

  const onSubmit = async () => {
    if (!user) return
    if (!form.title.trim() || !form.url.trim()) {
      toast({ title: 'Missing info', description: 'Title and URL are required' })
      return
    }
    if (form.visibility === 'section' && !form.target_section) {
      toast({ title: 'Missing section', description: 'Choose a section for a section link' })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        music_id: musicId,
        owner_id: user.id,
        title: form.title.trim(),
        url: form.url.trim(),
        visibility: form.visibility,
        target_section: form.visibility === 'section' ? form.target_section : null,
      }
      const { error } = await supabase.from('gw_practice_links').insert(payload)
      if (error) throw error
      toast({ title: 'Saved', description: 'Practice link added' })
      setForm({ title: '', url: '', visibility: 'personal', target_section: '' })
      fetchLinks()
    } catch (e: any) {
      console.error('Failed to save link', e)
      toast({ title: 'Error', description: e?.message || 'Failed to save link', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* YouTube Hero */}
      {youtubeLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Youtube className="h-4 w-4" /> Practice Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {/* Main video */}
              {getEmbedUrl(youtubeLinks[0].url) ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden border">
                  <iframe
                    src={`${getEmbedUrl(youtubeLinks[0].url)}?rel=0`}
                    title={youtubeLinks[0].title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : null}
              {/* Thumbnails / list */}
              {youtubeLinks.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {youtubeLinks.slice(1, 5).map(v => (
                    <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition">
                      <div className="h-16 w-28 bg-muted rounded overflow-hidden flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-2 leading-snug break-words">{v.title}</div>
                        <div className="text-xs text-muted-foreground">YouTube</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><PlusCircle className="h-4 w-4" /> Add Practice Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Sectional Audio, Piano Guide, YouTube Run" />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(v: any) => setForm({ ...form, visibility: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  {canManageSectionGlobal && <SelectItem value="section">Section</SelectItem>}
                  {canManageSectionGlobal && <SelectItem value="global">Global</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {form.visibility === 'section' && (
              <div>
                <Label>Target Section</Label>
                <Select value={form.target_section} onValueChange={(v) => setForm({ ...form, target_section: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceParts.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-5 flex justify-end">
              <Button onClick={onSubmit} disabled={saving}>{saving ? 'Saving…' : 'Add Link'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> All Practice Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading…</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No practice links yet.</div>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <div key={link.id} className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={link.visibility === 'global' ? 'default' : link.visibility === 'section' ? 'secondary' : 'outline'} className="capitalize">{link.visibility}</Badge>
                      {link.visibility === 'section' && link.target_section && (
                        <Badge variant="outline">{link.target_section}</Badge>
                      )}
                    </div>
                    <a href={link.url} target="_blank" rel="noreferrer" className="font-medium line-clamp-2 break-words underline-offset-2 hover:underline">
                      {link.title}
                    </a>
                    {link.notes && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{link.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
