import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeClientAction } from '../clientActions';

// The playlist actions import MusicKit lazily; mocked here so no test ever
// loads Apple's SDK or opens a sign-in popup.
const authorizeAppleMusic = vi.fn();
const listLibraryPlaylists = vi.fn();
const createLibraryPlaylist = vi.fn();
vi.mock('@/lib/musicKit', () => ({
  authorizeAppleMusic: (...a: unknown[]) => authorizeAppleMusic(...a),
  listLibraryPlaylists: (...a: unknown[]) => listLibraryPlaylists(...a),
  createLibraryPlaylist: (...a: unknown[]) => createLibraryPlaylist(...a),
}));

beforeEach(() => {
  authorizeAppleMusic.mockReset().mockResolvedValue({ ok: true });
  listLibraryPlaylists.mockReset().mockResolvedValue([
    { id: 'p.111', name: 'Sunday Warm-Ups' },
    { id: 'p.222', name: 'Spirituals' },
  ]);
  createLibraryPlaylist.mockReset().mockResolvedValue({ id: 'p.999' });
});

describe('create_apple_playlist', () => {
  it('creates with validated song ids and reports the count', async () => {
    const out = await executeClientAction({
      tool: 'create_apple_playlist',
      args: { name: 'Rehearsal Set', song_ids: ['12345678', 'bad id!', '87654321'] },
      confirm: false,
    });
    expect(out.ok).toBe(true);
    expect(createLibraryPlaylist).toHaveBeenCalledWith('Rehearsal Set', undefined, ['12345678', '87654321']);
    expect(out.message).toContain('2 songs');
  });

  it('requires a name before touching MusicKit', async () => {
    const out = await executeClientAction({ tool: 'create_apple_playlist', args: {}, confirm: false });
    expect(out.ok).toBe(false);
    expect(authorizeAppleMusic).not.toHaveBeenCalled();
  });

  it('surfaces the sign-in failure message instead of pretending', async () => {
    authorizeAppleMusic.mockResolvedValue({ ok: false, message: 'Sign-in cancelled.' });
    const out = await executeClientAction({ tool: 'create_apple_playlist', args: { name: 'X' }, confirm: false });
    expect(out.ok).toBe(false);
    expect(out.message).toBe('Sign-in cancelled.');
    expect(createLibraryPlaylist).not.toHaveBeenCalled();
  });
});

describe('play_my_playlist', () => {
  it('matches the library playlist by loose name and hands it to the popout', async () => {
    const out = await executeClientAction({ tool: 'play_my_playlist', args: { name: 'warm-ups' }, confirm: false });
    expect(out.ok).toBe(true);
    expect(out.appleMusic).toEqual({ id: 'p.111', kind: 'playlist', title: 'Sunday Warm-Ups' });
  });

  it('prefers an exact name over a substring match', async () => {
    listLibraryPlaylists.mockResolvedValue([
      { id: 'p.1', name: 'Spirituals and More' },
      { id: 'p.2', name: 'Spirituals' },
    ]);
    const out = await executeClientAction({ tool: 'play_my_playlist', args: { name: 'Spirituals' }, confirm: false });
    expect(out.appleMusic?.id).toBe('p.2');
  });

  it('is honest when nothing matches', async () => {
    const out = await executeClientAction({ tool: 'play_my_playlist', args: { name: 'Nonexistent' }, confirm: false });
    expect(out.ok).toBe(false);
    expect(out.message).toContain('Nonexistent');
  });
});

// Spotify actions share this file's mocked-module pattern.
const spotifyMock = {
  isSpotifyConnected: vi.fn(),
  connectSpotify: vi.fn(),
  searchSpotify: vi.fn(),
  playOnSpotify: vi.fn(),
};
vi.mock('@/lib/spotify', () => ({
  isSpotifyConnected: (...a: unknown[]) => spotifyMock.isSpotifyConnected(...a),
  connectSpotify: (...a: unknown[]) => spotifyMock.connectSpotify(...a),
  searchSpotify: (...a: unknown[]) => spotifyMock.searchSpotify(...a),
  playOnSpotify: (...a: unknown[]) => spotifyMock.playOnSpotify(...a),
}));

describe('play_spotify', () => {
  beforeEach(() => {
    spotifyMock.isSpotifyConnected.mockReset().mockReturnValue(true);
    spotifyMock.searchSpotify.mockReset().mockResolvedValue({ uri: 'spotify:track:1', title: 'Total Praise', artist: 'Richard Smallwood', artworkUrl: 'https://i/x.jpg' });
    spotifyMock.playOnSpotify.mockReset().mockResolvedValue(undefined);
    spotifyMock.connectSpotify.mockReset().mockResolvedValue(undefined);
  });

  it('searches, plays, and hands the popout a card', async () => {
    const out = await executeClientAction({ tool: 'play_spotify', args: { query: 'Total Praise' }, confirm: false });
    expect(out.ok).toBe(true);
    expect(out.spotify).toEqual({ title: 'Total Praise', artist: 'Richard Smallwood', artworkUrl: 'https://i/x.jpg' });
  });

  it('points at connect_spotify when not connected', async () => {
    spotifyMock.isSpotifyConnected.mockReturnValue(false);
    const out = await executeClientAction({ tool: 'play_spotify', args: { query: 'x' }, confirm: false });
    expect(out.ok).toBe(false);
    expect(out.message).toContain('connect Spotify');
  });

  it('translates the premium requirement into words', async () => {
    spotifyMock.playOnSpotify.mockRejectedValue(new Error('premium_required'));
    const out = await executeClientAction({ tool: 'play_spotify', args: { query: 'x' }, confirm: false });
    expect(out.ok).toBe(false);
    expect(out.message).toContain('Premium');
  });
});
