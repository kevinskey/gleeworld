// Runtime validator for Session JSON loaded from storage. Catches
// schema drift early — without this, a malformed session can cause
// silent rendering bugs or crashes deep in the audio engine.
//
// Returns { ok: true } on success or { ok: false, errors: [...] }
// listing every problem found (no early bailout — easier to fix).

import {
  STUDIO_SCHEMA_VERSIONS, type Session, type FxNode, type Track,
  isAudioClip, isAudioTrack, isMidiClip, isMidiTrack,
} from './session';

const VALID_FX_TYPES = new Set(['gain', 'eq3', 'compressor', 'reverb', 'delay', 'filter']);

export type ValidateResult =
  | { ok: true; session: Session }
  | { ok: false; errors: string[] };

export function validateSession(raw: unknown): ValidateResult {
  const errors: string[] = [];
  const at = (...path: (string | number)[]) => path.join('.');
  const must = (cond: unknown, msg: string) => { if (!cond) errors.push(msg); };

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['session is not an object'] };
  }
  const s = raw as Partial<Session>;

  if (!s.schema_version || !STUDIO_SCHEMA_VERSIONS.includes(s.schema_version)) {
    errors.push(`schema_version mismatch: got "${s.schema_version}", expected one of "1.0.0", "1.1.0"`);
  }
  must(typeof s.id === 'string', 'id must be a string');
  must(typeof s.title === 'string', 'title must be a string');
  must(typeof s.tenant_id === 'string', 'tenant_id must be a string');
  must(typeof s.owner_user_id === 'string', 'owner_user_id must be a string');
  must(typeof s.created_at === 'string', 'created_at must be an ISO string');
  must(typeof s.updated_at === 'string', 'updated_at must be an ISO string');
  must(typeof s.tempo_bpm === 'number' && s.tempo_bpm! > 0, 'tempo_bpm must be > 0');
  must(typeof s.length_seconds === 'number' && s.length_seconds! >= 0, 'length_seconds must be >= 0');

  if (!s.time_signature || typeof s.time_signature !== 'object') {
    errors.push('time_signature missing');
  } else {
    must(Number.isInteger(s.time_signature.numerator) && s.time_signature.numerator > 0, 'time_signature.numerator must be a positive integer');
    must([1, 2, 4, 8, 16].includes(s.time_signature.denominator), 'time_signature.denominator must be 1, 2, 4, 8, or 16');
  }

  if (!s.master) errors.push('master missing');
  else validateFxList(s.master.fx ?? [], 'master', errors);

  // Markers are optional (older sessions omit them) but must be
  // well-formed when present.
  if (s.markers !== undefined) {
    if (!Array.isArray(s.markers)) errors.push('markers must be an array');
    else s.markers.forEach((mk, i) => {
      if (!mk || typeof mk !== 'object') { errors.push(at('markers', i) + ' is not an object'); return; }
      must(typeof mk.id === 'string', at('markers', i, 'id') + ' must be a string');
      must(typeof mk.name === 'string', at('markers', i, 'name') + ' must be a string');
      must(typeof mk.seconds === 'number' && mk.seconds >= 0, at('markers', i, 'seconds') + ' must be >= 0');
    });
  }

  // Assets keyed by id for clip cross-reference checks.
  const assetIds = new Set<string>();
  if (!Array.isArray(s.assets)) errors.push('assets must be an array');
  else s.assets.forEach((a, i) => {
    if (!a || typeof a !== 'object') {
      errors.push(at('assets', i) + ' is not an object'); return;
    }
    must(typeof a.id === 'string', at('assets', i, 'id') + ' must be a string');
    must(typeof a.filename === 'string', at('assets', i, 'filename') + ' must be a string');
    must(['wav', 'mp3', 'aac', 'flac', 'ogg', 'webm', 'mp4', 'm4a'].includes(a.format), at('assets', i, 'format') + ' invalid');
    must(typeof a.duration_seconds === 'number' && a.duration_seconds >= 0, at('assets', i, 'duration_seconds') + ' must be >= 0');
    must(typeof a.sample_rate === 'number' && a.sample_rate > 0, at('assets', i, 'sample_rate') + ' must be > 0');
    must(typeof a.channels === 'number' && a.channels >= 1, at('assets', i, 'channels') + ' must be >= 1');
    if (a.id) assetIds.add(a.id);
  });

  if (!Array.isArray(s.tracks)) errors.push('tracks must be an array');
  else s.tracks.forEach((t, i) => validateTrack(t, i, assetIds, errors));

  if (errors.length) return { ok: false, errors };
  return { ok: true, session: s as Session };
}

function validateTrack(t: unknown, i: number, assetIds: Set<string>, errors: string[]) {
  const at = (...p: (string | number)[]) => ['tracks', i, ...p].join('.');
  if (!t || typeof t !== 'object') { errors.push(at() + ' not an object'); return; }
  const tr = t as Track;
  if (tr.kind !== 'audio' && tr.kind !== 'midi') { errors.push(at('kind') + ' must be "audio" or "midi"'); return; }
  if (typeof tr.id !== 'string') errors.push(at('id') + ' must be a string');
  if (typeof tr.name !== 'string') errors.push(at('name') + ' must be a string');
  if (typeof tr.volume_db !== 'number') errors.push(at('volume_db') + ' must be a number');
  if (typeof tr.pan !== 'number' || tr.pan < -1 || tr.pan > 1) errors.push(at('pan') + ' must be in -1..1');

  validateFxList(tr.fx ?? [], at('fx'), errors);

  if (isAudioTrack(tr)) {
    if (!Array.isArray(tr.clips)) { errors.push(at('clips') + ' must be an array'); return; }
    tr.clips.forEach((c, j) => {
      const cAt = (...p: (string | number)[]) => ['tracks', i, 'clips', j, ...p].join('.');
      if (!isAudioClip(c as never)) { errors.push(cAt('kind') + ' must be "audio"'); return; }
      if (typeof c.asset_id !== 'string' || !assetIds.has(c.asset_id)) {
        errors.push(cAt('asset_id') + ` references unknown asset "${c.asset_id}"`);
      }
      if (c.start_seconds < 0) errors.push(cAt('start_seconds') + ' must be >= 0');
      if (c.duration_seconds <= 0) errors.push(cAt('duration_seconds') + ' must be > 0');
    });
  } else if (isMidiTrack(tr)) {
    if (!Array.isArray(tr.clips)) { errors.push(at('clips') + ' must be an array'); return; }
    if (!tr.instrument) errors.push(at('instrument') + ' missing on midi track');
    tr.clips.forEach((c, j) => {
      const cAt = (...p: (string | number)[]) => ['tracks', i, 'clips', j, ...p].join('.');
      if (!isMidiClip(c as never)) { errors.push(cAt('kind') + ' must be "midi"'); return; }
      if (!Array.isArray(c.notes)) { errors.push(cAt('notes') + ' must be an array'); return; }
      c.notes.forEach((n, k) => {
        const nAt = (...p: (string | number)[]) => ['tracks', i, 'clips', j, 'notes', k, ...p].join('.');
        if (!Number.isInteger(n.pitch) || n.pitch < 0 || n.pitch > 127) errors.push(nAt('pitch') + ' must be 0..127');
        if (!Number.isInteger(n.velocity) || n.velocity < 0 || n.velocity > 127) errors.push(nAt('velocity') + ' must be 0..127');
        if (n.start_seconds < 0) errors.push(nAt('start_seconds') + ' must be >= 0');
        if (n.duration_seconds <= 0) errors.push(nAt('duration_seconds') + ' must be > 0');
      });
      // cc is optional (absent on 1.0.0 clips) — spec §7 requires corrupt/
      // absent cc to be treated as [], so only validate the shape when
      // present; a missing field is not an error.
      if (c.cc !== undefined) {
        if (!Array.isArray(c.cc)) { errors.push(cAt('cc') + ' must be an array'); }
        else c.cc.forEach((ev, k) => {
          const eAt = (...p: (string | number)[]) => ['tracks', i, 'clips', j, 'cc', k, ...p].join('.');
          if (!ev || typeof ev !== 'object') { errors.push(eAt() + ' is not an object'); return; }
          if (!Number.isInteger(ev.controller) || ev.controller < 0 || ev.controller > 127) errors.push(eAt('controller') + ' must be 0..127');
          if (!Number.isInteger(ev.value) || ev.value < 0 || ev.value > 127) errors.push(eAt('value') + ' must be 0..127');
          if (typeof ev.time_seconds !== 'number' || !Number.isFinite(ev.time_seconds) || ev.time_seconds < 0) errors.push(eAt('time_seconds') + ' must be >= 0');
        });
      }
    });
  }
}

function validateFxList(list: FxNode[], prefix: string, errors: string[]) {
  if (!Array.isArray(list)) { errors.push(prefix + '.fx must be an array'); return; }
  list.forEach((fx, k) => {
    const at = (s: string) => `${prefix}.fx.${k}.${s}`;
    if (!fx || typeof fx !== 'object') { errors.push(at('') + ' not an object'); return; }
    if (typeof fx.id !== 'string') errors.push(at('id') + ' must be a string');
    if (!VALID_FX_TYPES.has(fx.type)) errors.push(at('type') + ` invalid: "${fx.type}"`);
    if (typeof fx.enabled !== 'boolean') errors.push(at('enabled') + ' must be boolean');
    if (!fx.params || typeof fx.params !== 'object') errors.push(at('params') + ' must be an object');
  });
}
