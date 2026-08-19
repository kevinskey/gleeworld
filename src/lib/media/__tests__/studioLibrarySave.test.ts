import { describe, it, expect } from 'vitest';
import { saveStudioBlobToLibrary } from '../studioLibrarySave';

function fakeSb(uploadError: any, insertResult: { data?: any; error?: any }) {
  const inserted: any[] = [];
  const builder: any = {
    insert: (row: any) => { inserted.push(row); return builder; },
    select: () => builder,
    then: (res: any, rej: any) =>
      Promise.resolve({ data: insertResult.data ?? null, error: insertResult.error ?? null }).then(res, rej),
  };
  return {
    inserted,
    storage: {
      from: () => ({
        upload: async () => ({ error: uploadError }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/${p}` } }),
      }),
    },
    from: () => builder,
  } as any;
}

describe('saveStudioBlobToLibrary', () => {
  const blob = new Blob([new Uint8Array(4)], { type: 'audio/wav' });

  it('uploads under media/<uid>/studio/ and returns a ShareableMedia', async () => {
    const sb = fakeSb(null, { data: [{ id: 'row1' }] });
    const out = await saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    });
    expect(out.id).toBe('row1');
    expect(out.uploaded_by).toBe('u1');
    expect(out.file_path).toMatch(/^media\/u1\/studio\/\d+-take\.wav$/);
    expect(out.title).toBe('take');
    const row = sb.inserted[0];
    expect(row).toMatchObject({ folder: 'Studio', category: 'studio', course_id: null, is_public: false });
    for (const bad of ['filename', 'original_filename', 'mime_type', 'bucket_name']) {
      expect(row).not.toHaveProperty(bad);
    }
  });

  it('fails loudly when the insert matches zero rows (demo trap)', async () => {
    const sb = fakeSb(null, { data: [] });
    await expect(saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    })).rejects.toThrow(/not saved|read-only/i);
  });

  it('surfaces upload errors', async () => {
    const sb = fakeSb({ message: 'quota' }, { data: [{ id: 'x' }] });
    await expect(saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    })).rejects.toThrow(/quota/);
  });
});
