// Per-track EQ (B1 Task 5) — pure helpers, deliberately Tone-free so
// they unit-test hermetically (the existing engine test suites never
// instantiate Tone). tracks.ts consumes eqBandToBiquadOptions to build
// one Tone.BiquadFilter per enabled band; useStudio.ts consumes
// trackEqSig so EQ edits ride the same skeleton-diff full-rebuild path
// that FX edits already use.

import type { TrackEqBand } from '../session';

/** The node params for one EQ band's BiquadFilterNode.
 *
 * CANONICAL -> NODE MAPPING (B1 Global Constraints): the session's
 * canonical `q` is the RBJ-cookbook Q, and for these four filter types
 * (highpass / lowshelf / peaking / highshelf) the Web Audio
 * BiquadFilterNode implements exactly the RBJ cookbook filters — so
 * canonical q IS Web Audio Q and passes through 1:1, no conversion.
 * Per-type footnotes (all per the Web Audio spec, all harmless to pass
 * through unchanged):
 *   - peaking:    Q is the RBJ linear Q — the 1:1 case that matters.
 *   - highpass:   the spec interprets Q in dB (resonance at cutoff);
 *                 the canonical default (0.707 -> ~0.7 dB) is a flat,
 *                 Butterworth-adjacent response, which is the intent.
 *   - low/highshelf: the node IGNORES Q entirely (fixed shelf slope);
 *                 gain_db drives the shelf.
 *   - gain_db is ignored by the node for highpass. */
export interface EqBandNodeOptions {
  type: TrackEqBand['type'];
  frequency: number;
  gain: number;
  Q: number;
}

/** Canonical TrackEqBand -> BiquadFilterNode params (see the mapping
 * note on EqBandNodeOptions — 1:1, documented, no conversion). */
export function eqBandToBiquadOptions(band: TrackEqBand): EqBandNodeOptions {
  return {
    type: band.type,
    frequency: band.freq_hz,
    gain: band.gain_db,
    Q: band.q,
  };
}

/** The bands buildTrack actually instantiates: enabled ones, in array
 * order (band order is audible for shelving + HPF stages, so the
 * session's order is preserved verbatim). Disabled bands are skipped at
 * build time — same policy as buildFxChain's `enabled` filter; toggling
 * a band rebuilds the track via the skeleton diff. */
export function enabledEqBands(eq: TrackEqBand[] | undefined): TrackEqBand[] {
  return (eq ?? []).filter((b) => b.enabled);
}

/** Signature of a track's EQ stack for useStudio's engine-rebuild
 * skeleton diff — the EQ analog of the `fx.map(...)` skeleton entry.
 * ANY band change (params, order, enabled, add/remove) must change the
 * signature, since buildTrack bakes bands into the graph at build time. */
export function trackEqSig(eq: TrackEqBand[] | undefined): string {
  return (eq ?? [])
    .map((b) => `${b.type}:${b.freq_hz}:${b.gain_db}:${b.q}:${b.enabled}`)
    .join(',');
}
