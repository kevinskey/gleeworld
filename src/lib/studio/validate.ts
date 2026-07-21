// Runtime validator for Session JSON loaded from storage. Catches
// schema drift early — without this, a malformed session can cause
// silent rendering bugs or crashes deep in the audio engine.
//
// Returns { ok: true } on success or { ok: false, errors: [...] }
// listing every problem found (no early bailout — easier to fix).

import {
  STUDIO_SCHEMA_VERSIONS, type Session, type FxNode, type Track, type Bus,
  MAX_TRACKS, MAX_BUSES, MAX_SENDS_PER_TRACK, MAX_INSERTS_PER_STRIP,
  MASTER_BUS_ID,
  isAudioClip, isAudioTrack, isMidiClip, isMidiTrack,
} from './session';

const VALID_FX_TYPES = new Set(['gain', 'eq3', 'compressor', 'reverb', 'delay', 'filter']);
const VALID_INPUT_MONITOR = new Set(['off', 'auto', 'on']);

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
    errors.push(`schema_version mismatch: got "${s.schema_version}", expected one of ${STUDIO_SCHEMA_VERSIONS.map((v) => `"${v}"`).join(', ')}`);
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
  else {
    if (s.tracks.length > MAX_TRACKS) errors.push(`tracks: ${s.tracks.length} exceeds MAX_TRACKS (${MAX_TRACKS})`);
    s.tracks.forEach((t, i) => validateTrack(t, i, assetIds, errors));
  }

  // Buses are optional (absent on v1 sessions before the migration
  // has run). The load path always migrates first, but validate is
  // also called directly by save-time re-check, so tolerate absence.
  const busIds = new Set<string>([MASTER_BUS_ID]);
  if (s.buses !== undefined) {
    if (!Array.isArray(s.buses)) errors.push('buses must be an array');
    else {
      if (s.buses.length > MAX_BUSES) errors.push(`buses: ${s.buses.length} exceeds MAX_BUSES (${MAX_BUSES})`);
      s.buses.forEach((b, i) => validateBus(b, i, errors, busIds));
    }
  }

  // Cross-reference: track outputs and sends must resolve to a known bus.
  if (Array.isArray(s.tracks)) {
    s.tracks.forEach((t, i) => {
      if (t?.output && !busIds.has(t.output.bus_id)) {
        errors.push(at('tracks', i, 'output.bus_id') + ` references unknown bus "${t.output.bus_id}"`);
      }
      if (Array.isArray(t?.sends)) {
        t.sends.forEach((snd, j) => {
          if (snd && !busIds.has(snd.target_bus_id)) {
            errors.push(at('tracks', i, 'sends', j, 'target_bus_id') + ` references unknown bus "${snd.target_bus_id}"`);
          }
        });
      }
    });
  }
  // Same for bus outputs.
  if (Array.isArray(s.buses)) {
    s.buses.forEach((b, i) => {
      if (b?.output && !busIds.has(b.output.bus_id)) {
        errors.push(at('buses', i, 'output.bus_id') + ` references unknown bus "${b.output.bus_id}"`);
      }
    });
  }

  // v2.0.0 (Phase 8) — automation. Optional, so tolerate absence.
  if (s.automation !== undefined) {
    if (!Array.isArray(s.automation)) errors.push('automation must be an array');
    else {
      const trackIds = new Set((s.tracks ?? []).map((t: { id?: string }) => t.id).filter(Boolean));
      s.automation.forEach((a, i) => validateAutomation(a, i, errors, trackIds, busIds));
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, session: s as Session };
}

const VALID_AUTOMATION_PARAM = new Set(['volume_db', 'pan']);
const VALID_AUTOMATION_CURVE = new Set(['hold', 'linear', 'exponential']);
const VALID_AUTOMATION_MODE = new Set(['off', 'read']);
const VALID_AUTOMATION_KIND = new Set(['track', 'bus']);

function validateAutomation(
  a: unknown, i: number, errors: string[], trackIds: Set<string>, busIds: Set<string>,
) {
  const at = (...p: (string | number)[]) => ['automation', i, ...p].join('.');
  if (!a || typeof a !== 'object') { errors.push(at() + ' is not an object'); return; }
  const auto = a as {
    target_id?: string; target_kind?: string; param?: string; mode?: string;
    points?: Array<{ time_seconds?: unknown; value?: unknown; curve?: unknown }>;
  };
  if (typeof auto.target_id !== 'string' || !auto.target_id) {
    errors.push(at('target_id') + ' must be a non-empty string');
  } else if (auto.target_kind === 'track' && !trackIds.has(auto.target_id)) {
    errors.push(at('target_id') + ` references unknown track "${auto.target_id}"`);
  } else if (auto.target_kind === 'bus' && !busIds.has(auto.target_id)) {
    errors.push(at('target_id') + ` references unknown bus "${auto.target_id}"`);
  }
  if (!auto.target_kind || !VALID_AUTOMATION_KIND.has(auto.target_kind)) {
    errors.push(at('target_kind') + ' must be "track" or "bus"');
  }
  if (!auto.param || !VALID_AUTOMATION_PARAM.has(auto.param)) {
    errors.push(at('param') + ' must be "volume_db" or "pan"');
  }
  if (!auto.mode || !VALID_AUTOMATION_MODE.has(auto.mode)) {
    errors.push(at('mode') + ' must be "off" or "read"');
  }
  if (!Array.isArray(auto.points)) {
    errors.push(at('points') + ' must be an array');
  } else {
    auto.points.forEach((p, k) => {
      const pAt = (f: string) => at('points', k, f);
      if (!p || typeof p !== 'object') { errors.push(pAt('') + ' is not an object'); return; }
      if (typeof p.time_seconds !== 'number' || !Number.isFinite(p.time_seconds) || p.time_seconds < 0) {
        errors.push(pAt('time_seconds') + ' must be a finite number >= 0');
      }
      if (typeof p.value !== 'number' || !Number.isFinite(p.value)) {
        errors.push(pAt('value') + ' must be a finite number');
      }
      if (typeof p.curve !== 'string' || !VALID_AUTOMATION_CURVE.has(p.curve)) {
        errors.push(pAt('curve') + ' must be "hold", "linear", or "exponential"');
      }
    });
  }
}

function validateBus(b: unknown, i: number, errors: string[], busIds: Set<string>) {
  const at = (...p: (string | number)[]) => ['buses', i, ...p].join('.');
  if (!b || typeof b !== 'object') { errors.push(at() + ' is not an object'); return; }
  const bus = b as Partial<Bus>;
  if (typeof bus.id !== 'string' || !bus.id) errors.push(at('id') + ' must be a non-empty string');
  else if (bus.id === MASTER_BUS_ID) errors.push(at('id') + ` reserved (use a different id; "${MASTER_BUS_ID}" names the built-in master)`);
  else if (busIds.has(bus.id)) errors.push(at('id') + ` duplicate id "${bus.id}"`);
  else busIds.add(bus.id);
  if (typeof bus.name !== 'string') errors.push(at('name') + ' must be a string');
  if (typeof bus.volume_db !== 'number') errors.push(at('volume_db') + ' must be a number');
  if (typeof bus.pan !== 'number' || bus.pan < -1 || bus.pan > 1) errors.push(at('pan') + ' must be in -1..1');
  if (typeof bus.mute !== 'boolean') errors.push(at('mute') + ' must be a boolean');
  if (typeof bus.solo !== 'boolean') errors.push(at('solo') + ' must be a boolean');
  if (Array.isArray(bus.fx)) {
    if (bus.fx.length > MAX_INSERTS_PER_STRIP) errors.push(at('fx') + ` exceeds MAX_INSERTS_PER_STRIP (${MAX_INSERTS_PER_STRIP})`);
    validateFxList(bus.fx, at('fx'), errors);
  } else {
    errors.push(at('fx') + ' must be an array');
  }
  if (!bus.output || typeof bus.output !== 'object' || typeof bus.output.bus_id !== 'string') {
    errors.push(at('output.bus_id') + ' must be a string');
  }
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

  // v2.0.0 optional fields — validated only when present. The load-time
  // migration fills defaults for v1 sessions before this runs on the
  // way IN, so at that point every track should have output+sends. But
  // save-time re-validates the raw session first (pre-migration shape),
  // so tolerate absence here.
  if (tr.output !== undefined) {
    if (!tr.output || typeof tr.output !== 'object' || typeof tr.output.bus_id !== 'string' || !tr.output.bus_id) {
      errors.push(at('output.bus_id') + ' must be a non-empty string');
    }
  }
  if (tr.sends !== undefined) {
    if (!Array.isArray(tr.sends)) errors.push(at('sends') + ' must be an array');
    else {
      if (tr.sends.length > MAX_SENDS_PER_TRACK) {
        errors.push(at('sends') + ` exceeds MAX_SENDS_PER_TRACK (${MAX_SENDS_PER_TRACK})`);
      }
      tr.sends.forEach((snd, k) => {
        const sAt = (p: string) => at('sends', k, p);
        if (!snd || typeof snd !== 'object') { errors.push(sAt('') + ' not an object'); return; }
        if (typeof snd.id !== 'string' || !snd.id) errors.push(sAt('id') + ' must be a non-empty string');
        if (typeof snd.target_bus_id !== 'string' || !snd.target_bus_id) errors.push(sAt('target_bus_id') + ' must be a non-empty string');
        if (typeof snd.level_db !== 'number') errors.push(sAt('level_db') + ' must be a number');
        if (typeof snd.enabled !== 'boolean') errors.push(sAt('enabled') + ' must be a boolean');
        if (typeof snd.pre_fader !== 'boolean') errors.push(sAt('pre_fader') + ' must be a boolean');
      });
    }
  }
  if (tr.input_monitor !== undefined && !VALID_INPUT_MONITOR.has(tr.input_monitor)) {
    errors.push(at('input_monitor') + ` invalid: "${tr.input_monitor}" (expected off | auto | on)`);
  }

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
