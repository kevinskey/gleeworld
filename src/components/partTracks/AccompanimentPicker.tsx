// Accompaniment source picker — file upload, Apple Music search, or
// YouTube URL. Apple Music + YouTube don't get mixed INTO recordings
// (DRM puts their audio outside the Web Audio graph), but the studio
// plays them in parallel with the mix so the singer can record over
// any commercial backing track. Only the singer's voice is captured.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Upload, Youtube, Search, Loader2, X, AlertTriangle } from 'lucide-react';

interface AccompanimentPickerProps {
  open: boolean;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onPickAppleMusic: (track: { id: string; storefront: string; title: string; artist: string; artworkUrl: string | null }) => void;
  onPickAppleMusicAlbum: (album: { id: string; storefront: string; title: string; artist: string; artworkUrl: string | null }) => void;
  onPickYouTube: (url: string) => void;
}

export function AccompanimentPicker({
  open, onClose, onPickFile, onPickAppleMusic, onPickAppleMusicAlbum, onPickYouTube,
}: AccompanimentPickerProps) {
  const [tab, setTab] = useState<'file' | 'apple' | 'youtube'>('file');
  const [appleSearch, setAppleSearch] = useState('');
  const [appleSongs, setAppleSongs] = useState<any[]>([]);
  const [appleAlbums, setAppleAlbums] = useState<any[]>([]);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleErr, setAppleErr] = useState<string | null>(null);
  // Which result kind is visible inside the Apple Music tab. Pulled to
  // the top so users don't scroll past every song hit to find albums.
  const [appleKind, setAppleKind] = useState<'songs' | 'albums'>('songs');
  const [ytUrl, setYtUrl] = useState('');
  const [ytSearch, setYtSearch] = useState('');
  const [ytHits, setYtHits] = useState<Array<{ videoId: string; title: string; channelTitle: string; thumbnail: string; url: string }>>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytErr, setYtErr] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'apple') return;
    const term = appleSearch.trim();
    if (!term) { setAppleSongs([]); setAppleAlbums([]); setAppleErr(null); return; }
    let cancelled = false;
    setAppleLoading(true);
    setAppleErr(null);
    const handle = window.setTimeout(async () => {
      try {
        const { searchAppleMusic } = await import('@/lib/musicKit');
        const { songs, albums } = await searchAppleMusic(term);
        if (!cancelled) { setAppleSongs(songs); setAppleAlbums(albums); }
      } catch (e: any) {
        if (!cancelled) setAppleErr(e?.message ?? 'Apple Music search failed.');
      } finally {
        if (!cancelled) setAppleLoading(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [tab, appleSearch]);

  // YouTube search — same debounce pattern as Apple Music, but proxied
  // through the youtube-search edge fn (server holds the API key; each
  // search costs ~100 of the 10k/day quota units).
  useEffect(() => {
    if (tab !== 'youtube') return;
    const term = ytSearch.trim();
    if (!term) { setYtHits([]); setYtErr(null); return; }
    let cancelled = false;
    setYtLoading(true);
    setYtErr(null);
    const handle = window.setTimeout(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('youtube-search', {
          body: { q: term, maxResults: 10 },
        });
        if (error) throw error;
        const body = data as { hits?: typeof ytHits; error?: string };
        if (body?.error) throw new Error(body.error);
        if (!cancelled) setYtHits(body?.hits ?? []);
      } catch (e: any) {
        if (!cancelled) setYtErr(e?.message ?? 'YouTube search failed.');
      } finally {
        if (!cancelled) setYtLoading(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [tab, ytSearch]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1430] border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide uppercase text-amber-400">Choose backing track</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-amber-500/10 bg-black/30">
          {(['file', 'apple', 'youtube'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                tab === k
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {k === 'file' ? <span className="inline-flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload</span>
                : k === 'apple' ? <span className="inline-flex items-center gap-1.5"><Music className="w-3.5 h-3.5" /> Apple Music</span>
                : <span className="inline-flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5" /> YouTube</span>}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {tab === 'file' && (
            <label className="block">
              <span className="text-xs text-slate-400 mb-2 block">MP3 / WAV / M4A / AAC / FLAC</span>
              <input
                type="file"
                // Explicit extensions + MIME types. iOS Files app
                // doesn't always recognize `audio/*` alone — listing
                // common extensions makes MP3 / M4A / WAV selectable
                // even when the file's MIME type is missing.
                accept=".mp3,.wav,.m4a,.aac,.flac,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/flac,audio/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { onPickFile(f); onClose(); } }}
                className="block w-full text-sm text-slate-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-amber-500 file:text-slate-900 file:font-semibold file:hover:bg-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-3 italic">
                Mixed directly into the master track — peaks render in the timeline.
              </p>
            </label>
          )}

          {tab === 'apple' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={appleSearch}
                  onChange={(e) => setAppleSearch(e.target.value)}
                  placeholder="Song, artist, or album…"
                  className="pl-8 h-9 bg-black/40 border-amber-500/20 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Songs / Albums toggle — sits above the result list so the
                  user can flip the kind without scrolling past every song
                  hit. Count badge tells them how much is available in each. */}
              <div className="flex rounded-md border border-amber-500/20 bg-black/30 p-0.5">
                {(['songs', 'albums'] as const).map((k) => {
                  const active = appleKind === k;
                  const count = k === 'songs' ? appleSongs.length : appleAlbums.length;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAppleKind(k)}
                      className={`flex-1 px-3 py-1.5 text-xs uppercase tracking-wider font-semibold rounded transition-colors ${
                        active ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:text-slate-100'
                      }`}
                    >
                      {k === 'songs' ? 'Songs' : 'Albums'}
                      {count > 0 && (
                        <span className={`ml-1.5 text-[10px] ${active ? 'text-slate-900/70' : 'text-slate-500'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-amber-400/80 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Streaming sources play alongside the mix — they aren't captured into your recording (DRM).
              </p>
              {appleErr && <p className="text-xs text-rose-400">{appleErr}</p>}
              {appleLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching…
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {appleSongs.length === 0 && appleAlbums.length === 0 && appleSearch.trim() && (
                    <div className="p-4 text-center text-xs text-slate-500 italic">No results.</div>
                  )}

                  {appleKind === 'songs' && appleSongs.length > 0 && (
                    <div className="border border-amber-500/10 rounded divide-y divide-slate-800">
                      {appleSongs.map((r) => (
                        <button
                          key={`s-${r.id}`}
                          type="button"
                          onClick={() => { onPickAppleMusic({ id: r.id, storefront: r.storefront, title: r.title, artist: r.artist, artworkUrl: r.artworkUrl }); onClose(); }}
                          className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-amber-500/10 text-slate-200"
                        >
                          {r.artworkUrl
                            ? <img src={r.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                            : <Music className="w-10 h-10 text-amber-400/70 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-snug break-words">{r.title}</div>
                            <div className="text-xs text-slate-400 break-words">{r.artist}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {appleKind === 'albums' && appleAlbums.length > 0 && (
                    <div className="border border-amber-500/10 rounded divide-y divide-slate-800">
                      {appleAlbums.map((a) => (
                        <button
                          key={`a-${a.id}`}
                          type="button"
                          onClick={() => { onPickAppleMusicAlbum({ id: a.id, storefront: a.storefront, title: a.title, artist: a.artist, artworkUrl: a.artworkUrl }); onClose(); }}
                          className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-amber-500/10 text-slate-200"
                        >
                          {a.artworkUrl
                            ? <img src={a.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                            : <Music className="w-10 h-10 text-amber-400/70 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-snug break-words">
                              {a.title} <span className="text-[10px] text-slate-500 ml-1 whitespace-nowrap">· {a.trackCount} tracks</span>
                            </div>
                            <div className="text-xs text-slate-400 break-words">{a.artist}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {appleKind === 'songs' && appleSongs.length === 0 && appleAlbums.length > 0 && (
                    <p className="text-xs text-slate-500 italic px-2 py-3">
                      No song hits. Tap <span className="font-semibold text-amber-400">Albums</span> for the {appleAlbums.length} album result{appleAlbums.length === 1 ? '' : 's'}.
                    </p>
                  )}
                  {appleKind === 'albums' && appleAlbums.length === 0 && appleSongs.length > 0 && (
                    <p className="text-xs text-slate-500 italic px-2 py-3">
                      No album hits. Tap <span className="font-semibold text-amber-400">Songs</span> for the {appleSongs.length} song result{appleSongs.length === 1 ? '' : 's'}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'youtube' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={ytSearch}
                  onChange={(e) => setYtSearch(e.target.value)}
                  placeholder="Search YouTube…"
                  className="pl-8 h-9 bg-black/40 border-amber-500/20 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <p className="text-[11px] text-amber-400/80 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Plays alongside the mix — audio isn't captured into your recording.
              </p>
              {ytErr && <p className="text-xs text-rose-400">{ytErr}</p>}
              {ytLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching…
                </div>
              ) : ytHits.length > 0 ? (
                <div className="max-h-72 overflow-y-auto border border-amber-500/10 rounded divide-y divide-slate-800">
                  {ytHits.map((h) => (
                    <button
                      key={h.videoId}
                      type="button"
                      onClick={() => { onPickYouTube(h.url); onClose(); }}
                      className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-amber-500/10 text-slate-200"
                    >
                      {h.thumbnail
                        ? <img src={h.thumbnail} alt="" className="w-16 h-9 rounded object-cover shrink-0" />
                        : <Youtube className="w-9 h-9 text-amber-400/70 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug break-words">{h.title}</div>
                        <div className="text-xs text-slate-400 break-words">{h.channelTitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : ytSearch.trim() ? (
                <div className="p-4 text-center text-xs text-slate-500 italic">No results.</div>
              ) : null}

              <label className="block pt-1 border-t border-amber-500/10">
                <span className="text-xs text-slate-400 mb-1 mt-2 block">Or paste a YouTube URL</span>
                <Input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="bg-black/40 border-amber-500/20 text-slate-100 placeholder:text-slate-500"
                />
              </label>
              <Button
                onClick={() => {
                  const url = ytUrl.trim();
                  if (!/youtu(be\.com|\.be)/i.test(url)) return;
                  onPickYouTube(url);
                  onClose();
                }}
                disabled={!ytUrl.trim()}
                className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
              >
                <Youtube className="w-4 h-4 mr-1" /> Use this URL
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
