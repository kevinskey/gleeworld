// Pure sustain-pedal bookkeeping for MIDI capture — no audio, unit-tested.
// Piano semantics: a key released while the pedal is down keeps "sounding"
// (stays uncommitted) until the pedal lifts; re-striking a sustained pitch
// ends the old press at the re-strike moment. The caller commits whatever
// each event returns, stamping the note-off time itself.

export interface HeldPress {
  pitch: number;
  velocity: number;
  downAbsSeconds: number;
}

export class SustainTracker {
  private held = new Map<number, HeldPress>();      // key physically down
  private sustained = new Map<number, HeldPress>(); // key up, pedal holding
  private pedal = false;

  /** Track a key-down. Returns the OLD press to commit when this pitch was
   * being sustained (re-strike), else null. */
  keyDown(pitch: number, velocity: number, atSeconds: number): HeldPress | null {
    const evicted = this.sustained.get(pitch) ?? null;
    this.sustained.delete(pitch);
    this.held.set(pitch, { pitch, velocity, downAbsSeconds: atSeconds });
    return evicted;
  }

  /** Track a key-up. Returns the press to commit now, or null when the pedal
   * (or nothing) is holding it. */
  keyUp(pitch: number): HeldPress | null {
    const press = this.held.get(pitch);
    if (!press) return null;
    this.held.delete(pitch);
    if (this.pedal) {
      this.sustained.set(pitch, press);
      return null;
    }
    return press;
  }

  /** Move the pedal. Pedal-up returns every sustained press to commit.
   * Duplicate messages (same position) are no-ops — the WP06 broadcasts the
   * pedal on three channels. */
  setPedal(down: boolean): HeldPress[] {
    if (down === this.pedal) return [];
    this.pedal = down;
    if (down) return [];
    const commits = [...this.sustained.values()];
    this.sustained.clear();
    return commits;
  }

  /** Record stop: commit everything still held or sustained. Pedal position
   * is kept — it reflects the physical pedal, not the take. */
  flush(): HeldPress[] {
    const commits = [...this.held.values(), ...this.sustained.values()];
    this.held.clear();
    this.sustained.clear();
    return commits;
  }
}
