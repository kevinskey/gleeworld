import { supabase } from '@/integrations/supabase/client';
import { editorScoreToMusicXML } from '@/lib/notation/musicxmlWrite';
import type { EditorScore } from '@/lib/notation/model';
import { PSALM_TAG } from './psalmComposer';

/**
 * Saving a composed responsorial psalm into the music library.
 *
 * These are ordinary gw_sheet_music rows, not a parallel store: the library
 * already has xml_content for MusicXML, and a psalm setting someone wrote is
 * repertoire — it should turn up in search, land in collections, and open in
 * the viewer like anything else. PSALM_TAG is what files it under
 * Responsorial Psalms; the library's tag filter is already wired to it, so
 * this needs no new browse UI.
 */

export interface SavePsalmInput {
  score: EditorScore;
  title: string;
  /** Who composed it. Defaults to the signed-in user but is editable — a
   *  director often enters a setting written by a cantor or a parishioner. */
  composer: string;
  /** Rendered staff, stored as the library thumbnail so the psalm is
   *  recognisable in a grid without opening it. Optional: a save must not
   *  fail because rasterising did. */
  image?: Blob | null;
  /** Existing row to overwrite, for "save" after a first save. */
  existingId?: string | null;
}

export interface SavedPsalm { id: string; imageUrl: string | null }

const BUCKET = 'sheet-music';

export async function savePsalmToLibrary({
  score, title, composer, image, existingId,
}: SavePsalmInput): Promise<SavedPsalm> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('You need to be signed in to save to the library.');

  const xml = editorScoreToMusicXML({ ...score, title });

  // Upload the image FIRST when there is one: a row that points at a
  // thumbnail which failed to upload is worse than a row with no thumbnail.
  let imageUrl: string | null = null;
  if (image) {
    const path = `${userId}/psalms/${Date.now()}.jpg`;
    const up = await supabase.storage.from(BUCKET).upload(path, image, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (!up.error) {
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl ?? null;
    }
    // A failed upload is deliberately non-fatal — the music itself is the
    // xml_content, and losing the picture must not lose the setting.
  }

  const fields = {
    title,
    composer,
    xml_content: xml,
    key_signature: keyLabel(score),
    time_signature: `${score.timeSig.beats}/${score.timeSig.beatType}`,
    language: 'English',
    ...(imageUrl ? { thumbnail_url: imageUrl } : {}),
  };

  if (existingId) {
    const { error } = await supabase.from('gw_sheet_music').update(fields).eq('id', existingId);
    if (error) throw new Error(error.message);
    return { id: existingId, imageUrl };
  }

  // tenant_id fills from its DEFAULT current_tenant_id().
  const { data, error } = await supabase
    .from('gw_sheet_music')
    .insert({ ...fields, created_by: userId, tags: [PSALM_TAG] })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { id: data!.id as string, imageUrl };
}

/** "Eb major" / "D minor" — the human label the library column expects. */
export function keyLabel(score: EditorScore): string {
  const sharps = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const flats = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  const minorSharps = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
  const minorFlats = ['A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];
  const f = Math.max(-7, Math.min(7, score.keyFifths));
  const table = score.mode === 'minor'
    ? (f >= 0 ? minorSharps : minorFlats)
    : (f >= 0 ? sharps : flats);
  return `${table[Math.abs(f)]} ${score.mode}`;
}
