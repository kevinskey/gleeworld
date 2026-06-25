// Map each FxType in the session schema to a concrete Tone.js node.
// `buildFxChain` returns an object exposing one input + one output —
// the engine wires those into the master bus or a track strip.
//
// Param keys here MUST match the defaults declared in defaults.ts so
// presets round-trip through save/load.

import * as Tone from 'tone';
import type { FxNode } from '../session';

export interface EngineFxNode {
  type: FxNode['type'];
  inputOutput: Tone.ToneAudioNode;   // node that's both input & output
  applyParams: (params: FxNode['params']) => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

export interface EngineFxChain {
  input: Tone.ToneAudioNode;
  output: Tone.ToneAudioNode;
  nodes: EngineFxNode[];
  dispose: () => void;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function buildFxNode(spec: FxNode): EngineFxNode {
  switch (spec.type) {
    case 'gain': {
      const node = new Tone.Gain(num(spec.params.gain_db, 0) === 0
        ? 1 : Math.pow(10, num(spec.params.gain_db, 0) / 20));
      return {
        type: 'gain', inputOutput: node,
        applyParams: (p) => { node.gain.value = Math.pow(10, num(p.gain_db, 0) / 20); },
        setEnabled: () => { /* gain handled via bypass node */ },
        dispose: () => node.dispose(),
      };
    }
    case 'eq3': {
      const node = new Tone.EQ3(num(spec.params.low_db, 0), num(spec.params.mid_db, 0), num(spec.params.high_db, 0));
      return {
        type: 'eq3', inputOutput: node,
        applyParams: (p) => {
          node.low.value = num(p.low_db, 0);
          node.mid.value = num(p.mid_db, 0);
          node.high.value = num(p.high_db, 0);
        },
        setEnabled: () => {},
        dispose: () => node.dispose(),
      };
    }
    case 'compressor': {
      const node = new Tone.Compressor({
        threshold: num(spec.params.threshold_db, -18),
        ratio: num(spec.params.ratio, 3),
        attack: num(spec.params.attack_ms, 5) / 1000,
        release: num(spec.params.release_ms, 80) / 1000,
      });
      return {
        type: 'compressor', inputOutput: node,
        applyParams: (p) => {
          node.threshold.value = num(p.threshold_db, -18);
          node.ratio.value = num(p.ratio, 3);
          node.attack.value = num(p.attack_ms, 5) / 1000;
          node.release.value = num(p.release_ms, 80) / 1000;
        },
        setEnabled: () => {},
        dispose: () => node.dispose(),
      };
    }
    case 'reverb': {
      const node = new Tone.Reverb({
        wet: num(spec.params.wet, 0.25),
        decay: 1 + num(spec.params.room_size, 0.6) * 3,
      });
      return {
        type: 'reverb', inputOutput: node,
        applyParams: (p) => {
          node.wet.value = num(p.wet, 0.25);
          // decay change requires async regenerate — keep simple here.
        },
        setEnabled: () => {},
        dispose: () => node.dispose(),
      };
    }
    case 'delay': {
      const node = new Tone.FeedbackDelay({
        delayTime: num(spec.params.time_ms, 350) / 1000,
        feedback: num(spec.params.feedback, 0.35),
        wet: num(spec.params.wet, 0.25),
      });
      return {
        type: 'delay', inputOutput: node,
        applyParams: (p) => {
          node.delayTime.value = num(p.time_ms, 350) / 1000;
          node.feedback.value = num(p.feedback, 0.35);
          node.wet.value = num(p.wet, 0.25);
        },
        setEnabled: () => {},
        dispose: () => node.dispose(),
      };
    }
    case 'filter': {
      const kind = (spec.params.kind as string) ?? 'low';
      const map: Record<string, 'lowpass' | 'highpass' | 'bandpass'> = {
        low: 'lowpass', high: 'highpass', band: 'bandpass',
      };
      const node = new Tone.Filter({
        type: map[kind] ?? 'lowpass',
        frequency: num(spec.params.cutoff_hz, 1000),
        Q: num(spec.params.q, 0.7),
      });
      return {
        type: 'filter', inputOutput: node,
        applyParams: (p) => {
          const k = (p.kind as string) ?? 'low';
          node.type = (map[k] ?? 'lowpass');
          node.frequency.value = num(p.cutoff_hz, 1000);
          node.Q.value = num(p.q, 0.7);
        },
        setEnabled: () => {},
        dispose: () => node.dispose(),
      };
    }
  }
}

/** Chain a list of FX in series. Bypassed nodes are skipped at build
 * time — toggling enabled in the UI rebuilds the chain. */
export function buildFxChain(specs: FxNode[]): EngineFxChain {
  const nodes = specs.filter((s) => s.enabled).map(buildFxNode);
  // A pair of gain nodes flank the chain so the engine has stable
  // input/output references even when nodes change.
  const input = new Tone.Gain(1);
  const output = new Tone.Gain(1);

  if (nodes.length === 0) {
    input.connect(output);
  } else {
    input.connect(nodes[0].inputOutput);
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].inputOutput.connect(nodes[i + 1].inputOutput);
    }
    nodes[nodes.length - 1].inputOutput.connect(output);
  }

  return {
    input, output, nodes,
    dispose: () => {
      input.dispose();
      output.dispose();
      for (const n of nodes) n.dispose();
    },
  };
}
