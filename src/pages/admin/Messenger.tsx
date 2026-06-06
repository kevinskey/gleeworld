// /messenger — GroupMe-style group chat. Phase 2: multi-emoji reactions,
// image upload, AI summary, @mentions, section auto-groups, emergency broadcast.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Send, Users, Plus, MessageSquare, X, Loader2, Image as ImageIcon,
  Sparkles, Megaphone, SmilePlus, BarChart3, Calendar, Mail, Newspaper, Video,
} from 'lucide-react';
import { useActiveMeeting } from '@/contexts/ActiveMeetingContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { VoiceRecorder } from '@/components/messenger/VoiceRecorder';
import { PollCard } from '@/components/messenger/PollCard';
import { PollComposer } from '@/components/messenger/PollComposer';
import { RsvpCard } from '@/components/messenger/RsvpCard';
import { RsvpComposer } from '@/components/messenger/RsvpComposer';
import { EmailBlastComposer } from '@/components/messenger/EmailBlastComposer';
import { NewsletterList } from '@/components/messenger/NewsletterList';
import { JitsiEmbedModal } from '@/components/messenger/JitsiEmbedModal';

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string | null;
  content: string | null;
  message_type: string;
  file_url: string | null;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null } | null;
  reactions?: Array<{ user_id: string; emoji: string }>;
}

interface Member {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const EMOJIS = ['❤️', '😂', '👍', '🎉', '🔥', '🙏'];
const SECTIONS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

export default function Messenger() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { startMeeting } = useActiveMeeting();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [composer, setComposer] = useState('');
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState('');
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [showRsvpComposer, setShowRsvpComposer] = useState(false);
  const [showEmailBlast, setShowEmailBlast] = useState(false);
  const [showNewsletters, setShowNewsletters] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['messenger-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_message_groups')
        .select('id, name, description, group_type, avatar_url')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messenger-messages', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const { data, error } = await supabase
        .from('gw_group_messages')
        .select(`
          id, group_id, user_id, content, message_type, file_url, created_at,
          author:gw_profiles!fk_gw_group_messages_user_profile(full_name, avatar_url),
          reactions:gw_message_reactions(user_id, emoji)
        `)
        .eq('group_id', selectedGroupId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any;
    },
    enabled: !!selectedGroupId,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['messenger-members', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const { data, error } = await supabase
        .from('gw_group_members')
        .select('user_id, role, profile:gw_profiles!inner(full_name, email, avatar_url)')
        .eq('group_id', selectedGroupId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.profile.full_name,
        email: m.profile.email,
        avatar_url: m.profile.avatar_url,
      }));
    },
    enabled: !!selectedGroupId && showMembers,
  });

  useEffect(() => {
    if (!selectedGroupId) return;
    setSummary(null);
    const channel = supabase
      .channel(`messenger:${selectedGroupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'gw_group_messages',
        filter: `group_id=eq.${selectedGroupId}`,
      }, () => qc.invalidateQueries({ queryKey: ['messenger-messages', selectedGroupId] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'gw_message_reactions',
      }, () => qc.invalidateQueries({ queryKey: ['messenger-messages', selectedGroupId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroupId, qc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!selectedGroupId || !user) return;
    supabase.from('gw_group_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('group_id', selectedGroupId)
      .eq('user_id', user.id)
      .then(() => {});
  }, [selectedGroupId, user, messages.length]);

  async function sendMessage(content?: string, type: string = 'text', fileUrl?: string) {
    const text = (content ?? composer).trim();
    if (!selectedGroupId || !user) return;
    if (type === 'text' && !text) return;
    if (type === 'text') setComposer('');
    const { error } = await supabase.from('gw_group_messages').insert({
      group_id: selectedGroupId,
      user_id: user.id,
      content: text || null,
      message_type: type,
      file_url: fileUrl || null,
    });
    if (error) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
      if (type === 'text') setComposer(text);
    }
  }

  async function toggleReaction(msg: Message, emoji: string) {
    if (!user) return;
    setReactionPickerFor(null);
    const existing = msg.reactions?.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from('gw_message_reactions')
        .delete()
        .eq('message_id', msg.id).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('gw_message_reactions').insert({
        message_id: msg.id, user_id: user.id, emoji,
      });
    }
  }

  async function createGroup() {
    if (!newGroupName.trim() || !user) return;
    const { data, error } = await supabase.from('gw_message_groups')
      .insert({ name: newGroupName.trim(), created_by: user.id, group_type: 'general' })
      .select('id').single();
    if (error) {
      toast({ title: 'Create failed', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('gw_group_members').insert({
      group_id: data.id, user_id: user.id, role: 'admin',
    });
    setNewGroupName(''); setShowNewGroup(false);
    qc.invalidateQueries({ queryKey: ['messenger-groups'] });
    setSelectedGroupId(data.id);
  }

  async function createSectionGroups() {
    if (!user) return;
    setShowNewGroup(false);
    const created: string[] = [];
    for (const section of SECTIONS) {
      const existing = groups.find((g) => g.name.toLowerCase() === section.toLowerCase());
      if (existing) continue;
      const { data, error } = await supabase.from('gw_message_groups').insert({
        name: section, group_type: 'voice_section', description: `${section} section chat`, created_by: user.id,
      }).select('id').single();
      if (error) continue;
      await supabase.from('gw_group_members').insert({ group_id: data.id, user_id: user.id, role: 'admin' });
      // Auto-add students with matching voice_part.
      const { data: studs } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .ilike('voice_part', `%${section.toLowerCase()}%`);
      if (studs && studs.length > 0) {
        await supabase.from('gw_group_members').insert(
          studs.map((s) => ({ group_id: data.id, user_id: s.user_id, role: 'member' }))
        );
      }
      created.push(section);
    }
    qc.invalidateQueries({ queryKey: ['messenger-groups'] });
    toast({ title: created.length ? 'Section chats ready' : 'All sections already exist',
      description: created.length ? `Created ${created.join(', ')}.` : undefined });
  }

  async function uploadImage(file: File) {
    if (!selectedGroupId || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedGroupId}/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('messenger-attachments')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('messenger-attachments').getPublicUrl(path);
      await sendMessage('', 'image', pub.publicUrl);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function summarize() {
    if (!selectedGroupId || messages.length === 0) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const recent = messages.slice(-50).map((m) =>
        `${m.author?.full_name || 'Someone'}: ${m.content || `[${m.message_type}]`}`
      ).join('\n');
      const prompt = `Summarize the key points from this group chat in 3-5 concise bullet points. Skip pleasantries. Focus on decisions, questions, and action items.\n\n${recent}`;
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { prompt } });
      if (error) throw error;
      const text = data?.choices?.[0]?.message?.content || data?.content || '';
      setSummary(text);
    } catch (e: any) {
      toast({ title: 'Summary failed', description: e.message, variant: 'destructive' });
    } finally {
      setSummarizing(false);
    }
  }

  async function startGroupMeeting() {
    if (!user) return;
    const slug = selectedGroup ? selectedGroup.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'meeting';
    const roomName = `gleeworld-${slug}-${Date.now().toString(36)}`;
    setActiveMeetingRoom(roomName);
    if (selectedGroup) {
      await supabase.from('gw_group_messages').insert({
        group_id: selectedGroup.id,
        user_id: user.id,
        content: `🎥 Video meeting started — room: ${roomName}`,
        message_type: 'system',
      });
    }
  }

  async function sendBroadcast() {
    if (!broadcastBody.trim() || !user) return;
    const text = `🚨 ANNOUNCEMENT: ${broadcastBody.trim()}`;
    let succeeded = 0;
    for (const g of groups) {
      const { error } = await supabase.from('gw_group_messages').insert({
        group_id: g.id, user_id: user.id, content: text, message_type: 'text',
      });
      if (!error) succeeded++;
    }
    setBroadcastBody('');
    setShowBroadcast(false);
    toast({ title: 'Broadcast sent', description: `Posted to ${succeeded} group${succeeded === 1 ? '' : 's'}.` });
  }

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId), [groups, selectedGroupId]);
  const memberNames = useMemo(() => new Set(members.map((m) => (m.full_name || m.email).toLowerCase())), [members]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
      <aside className="w-64 sm:w-72 border-r flex flex-col bg-muted/30">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Groups
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={startGroupMeeting} title={selectedGroup ? `Start meeting in ${selectedGroup.name}` : 'Start instant meeting'}>
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewsletters(true)} title="Newsletters (drafts, scheduled, sent)">
              <Newspaper className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEmailBlast(true)} title="Quick email blast">
              <Mail className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBroadcast(true)} title="Emergency broadcast to all groups">
              <Megaphone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewGroup((v) => !v)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showNewGroup && (
          <div className="p-2 border-b space-y-1">
            <div className="flex gap-1">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                placeholder="Group name"
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={createGroup} disabled={!newGroupName.trim()}>Add</Button>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={createSectionGroups}>
              ⚡ Create section chats (S/A/T/B)
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No groups yet. Tap + to create one.</p>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`w-full text-left px-3 py-3 border-b hover:bg-muted/60 ${
                g.id === selectedGroupId ? 'bg-muted' : ''
              }`}
            >
              <div className="font-semibold text-sm truncate">{g.name}</div>
              <div className="text-xs text-muted-foreground truncate">{g.description || g.group_type}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {selectedGroup ? (
          <>
            <header className="border-b px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="font-semibold truncate">{selectedGroup.name}</h1>
                {selectedGroup.description && (
                  <p className="text-xs text-muted-foreground truncate">{selectedGroup.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={startGroupMeeting} title="Start video meeting">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={summarize} disabled={summarizing || messages.length === 0} title="AI summary">
                  {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMembers((v) => !v)}>
                  <Users className="w-4 h-4" />
                </Button>
              </div>
            </header>

            {summary && (
              <Card className="mx-4 mt-3 border-amber-300 bg-amber-50/50">
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-600" /> What you missed</span>
                    <Button variant="ghost" size="sm" onClick={() => setSummary(null)}><X className="w-3 h-3" /></Button>
                  </div>
                  <div className="whitespace-pre-wrap text-xs">{summary}</div>
                </CardContent>
              </Card>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hi.</p>
              )}
              {messages.map((m, i) => {
                const isMe = m.user_id === user?.id;
                const showAuthor = i === 0 || messages[i - 1].user_id !== m.user_id;
                const reactionCounts = countReactions(m.reactions, user?.id);
                return (
                  <div key={m.id} className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 shrink-0">
                      {showAuthor && (
                        <Avatar name={m.author?.full_name || '?'} url={m.author?.avatar_url} />
                      )}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {showAuthor && !isMe && (
                        <span className="text-xs text-muted-foreground mb-0.5">{m.author?.full_name || 'Unknown'}</span>
                      )}
                      {m.message_type === 'image' && m.file_url ? (
                        <a href={m.file_url} target="_blank" rel="noreferrer">
                          <img src={m.file_url} alt="" className="rounded-2xl max-w-xs max-h-80 object-cover" />
                        </a>
                      ) : m.message_type === 'audio' && m.file_url ? (
                        <audio controls src={m.file_url} className="max-w-xs" />
                      ) : m.message_type === 'poll' ? (
                        <PollCard messageId={m.id} />
                      ) : m.message_type === 'system' && m.content?.startsWith('RSVP:') ? (
                        <RsvpCard messageId={m.id} eventId={m.content.split('|')[1]} />
                      ) : m.message_type === 'system' && m.content?.includes('room:') ? (
                        <MeetingJoinCard content={m.content} onJoin={(room) => setActiveMeetingRoom(room)} />
                      ) : (
                        <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          {renderWithMentions(m.content || '', memberNames)}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <button
                          onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                          className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <SmilePlus className="w-3 h-3" />
                        </button>
                        {Object.entries(reactionCounts).map(([emoji, info]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m, emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${
                              info.mine ? 'bg-primary/10 border-primary/30' : 'bg-background border-border'
                            } hover:scale-105 transition-transform`}
                          >
                            {emoji} {info.count}
                          </button>
                        ))}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      {reactionPickerFor === m.id && (
                        <div className="flex gap-1 mt-1 bg-popover border rounded-full px-2 py-1 shadow">
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => toggleReaction(m, e)}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <footer className="border-t p-3 flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Image"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </Button>
              {user && <VoiceRecorder groupId={selectedGroup.id} userId={user.id} onUpload={(url) => sendMessage('', 'audio', url)} />}
              <Button variant="ghost" size="sm" onClick={() => setShowPollComposer(true)} title="Poll">
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRsvpComposer(true)} title="Event RSVP">
                <Calendar className="w-4 h-4" />
              </Button>
              <Input
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${selectedGroup.name}…`}
                className="flex-1"
              />
              <Button onClick={() => sendMessage()} disabled={!composer.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Pick a group from the left, or create a new one.
          </div>
        )}
      </main>

      {showMembers && selectedGroup && (
        <aside className="w-64 border-l bg-muted/30 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Members ({members.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowMembers(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <MemberAdder groupId={selectedGroup.id} currentMembers={members} onChange={() => qc.invalidateQueries({ queryKey: ['messenger-members', selectedGroup.id] })} />
          <div className="flex-1 overflow-y-auto">
            {members.map((m) => (
              <div key={m.user_id} className="px-3 py-2 border-b flex items-center gap-2 text-sm">
                <Avatar name={m.full_name || m.email} url={m.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{m.full_name || m.email}</div>
                  {m.role !== 'member' && <div className="text-[10px] text-muted-foreground capitalize">{m.role}</div>}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {activeMeetingRoom && user && (
        <JitsiEmbedModal
          roomName={activeMeetingRoom}
          userName={userProfile?.full_name || user.email || 'Guest'}
          userEmail={user.email}
          onClose={() => setActiveMeetingRoom(null)}
        />
      )}
      {showEmailBlast && (
        <EmailBlastComposer onClose={() => setShowEmailBlast(false)} />
      )}
      {showNewsletters && (
        <NewsletterList onClose={() => setShowNewsletters(false)} />
      )}
      {showPollComposer && selectedGroup && user && (
        <PollComposer
          groupId={selectedGroup.id}
          userId={user.id}
          onClose={() => {
            setShowPollComposer(false);
            qc.invalidateQueries({ queryKey: ['messenger-messages', selectedGroup.id] });
          }}
        />
      )}
      {showRsvpComposer && selectedGroup && user && (
        <RsvpComposer
          groupId={selectedGroup.id}
          userId={user.id}
          onClose={() => {
            setShowRsvpComposer(false);
            qc.invalidateQueries({ queryKey: ['messenger-messages', selectedGroup.id] });
          }}
        />
      )}

      {/* Broadcast modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-md my-4 bg-white text-gray-900">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-gray-900"><Megaphone className="w-5 h-5 text-red-600" /> Emergency broadcast</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBroadcast(false)} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Posts this message to all {groups.length} groups with a 🚨 prefix.</p>
              <Textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Rehearsal cancelled tonight due to weather."
                className="min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowBroadcast(false)}>Cancel</Button>
                <Button onClick={sendBroadcast} disabled={!broadcastBody.trim()}>
                  <Megaphone className="w-4 h-4 mr-2" /> Send to all
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function countReactions(reactions: Array<{ user_id: string; emoji: string }> | undefined, myId?: string): Record<string, { count: number; mine: boolean }> {
  if (!reactions) return {};
  const out: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!out[r.emoji]) out[r.emoji] = { count: 0, mine: false };
    out[r.emoji].count++;
    if (myId && r.user_id === myId) out[r.emoji].mine = true;
  }
  return out;
}

function renderWithMentions(text: string, memberNames: Set<string>) {
  if (!text) return null;
  const parts = text.split(/(@\w+(?:\s\w+)?)/g);
  return parts.map((p, i) => {
    if (p.startsWith('@')) {
      const candidate = p.slice(1).toLowerCase();
      const isMention = Array.from(memberNames).some((n) => n.includes(candidate));
      if (isMention) {
        return <span key={i} className="font-semibold text-primary">{p}</span>;
      }
    }
    return <span key={i}>{p}</span>;
  });
}

function MeetingJoinCard({ content, onJoin }: { content: string; onJoin: (room: string) => void }) {
  const room = content.match(/room:\s*([a-z0-9-]+)/i)?.[1];
  if (!room) return <div className="text-sm text-muted-foreground italic">{content}</div>;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm flex items-center justify-between gap-3">
      <span className="flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Video meeting</span>
      <Button size="sm" onClick={() => onJoin(room)}>Join</Button>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center">
      {initials || '?'}
    </div>
  );
}

function MemberAdder({ groupId, currentMembers, onChange }: { groupId: string; currentMembers: Member[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const existingIds = new Set(currentMembers.map((m) => m.user_id));

  const { data: candidates = [] } = useQuery({
    queryKey: ['messenger-add-candidates', q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const { data } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);
      return (data ?? []).filter((p: any) => !existingIds.has(p.user_id));
    },
    enabled: open && q.length > 1,
  });

  async function add(userId: string) {
    setBusy(true);
    const { error } = await supabase.from('gw_group_members').insert({
      group_id: groupId, user_id: userId, role: 'member',
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Add failed', description: error.message, variant: 'destructive' });
      return;
    }
    setQ('');
    onChange();
  }

  return (
    <div className="border-b p-2">
      {open ? (
        <div className="space-y-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name/email…" className="h-8 text-sm" autoFocus />
          <div className="max-h-40 overflow-y-auto">
            {candidates.map((c: any) => (
              <button
                key={c.user_id}
                onClick={() => add(c.user_id)}
                disabled={busy}
                className="w-full text-left p-1.5 text-xs hover:bg-muted rounded flex items-center justify-between"
              >
                <span className="truncate">{c.full_name || c.email}</span>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              </button>
            ))}
            {q.length > 1 && candidates.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No matches.</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setOpen(false); setQ(''); }}>
            Close
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3 mr-1" /> Add member
        </Button>
      )}
    </div>
  );
}
