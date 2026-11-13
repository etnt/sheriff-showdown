/**
 * Synthesized sound effects built with WebAudio. No asset files: every
 * sound is an oscillator or a burst of noise.
 *
 * Browsers block audio until the user interacts with the page, so the
 * AudioContext is created lazily by `unlock()`, which the caller invokes
 * on the first input. Until then every play call is a silent no-op.
 */

export type SoundName = 'shot' | 'villainHit' | 'citizenHit' | 'villainFired' | 'gameOver';

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Create or resume the audio context. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext;
    if (!Ctor) return; // No WebAudio: stay silent.
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(this.ctx);
    } catch {
      this.ctx = null;
    }
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    switch (name) {
      case 'shot':
        this.noiseBurst(t, 0.18, 1800, 0.9);
        this.tone(t, 0.12, 180, 60, 'square', 0.25);
        break;
      case 'villainHit':
        this.tone(t, 0.18, 520, 220, 'triangle', 0.35);
        this.noiseBurst(t, 0.06, 3000, 0.25);
        break;
      case 'citizenHit':
        this.tone(t, 0.45, 440, 110, 'sawtooth', 0.3);
        break;
      case 'villainFired':
        this.noiseBurst(t, 0.12, 900, 0.5);
        this.tone(t + 0.02, 0.15, 260, 140, 'square', 0.15);
        break;
      case 'gameOver':
        this.tone(t, 0.25, 392, 370, 'triangle', 0.3);
        this.tone(t + 0.25, 0.25, 330, 310, 'triangle', 0.3);
        this.tone(t + 0.5, 0.6, 262, 200, 'triangle', 0.3);
        break;
    }
  }

  /** Short pitch-swept tone with a fast exponential decay. */
  private tone(
    start: number,
    duration: number,
    fromHz: number,
    toHz: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, start);
    osc.frequency.exponentialRampToValueAtTime(toHz, start + duration);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Filtered noise with a fast decay: gunfire, thuds, rattles. */
  private noiseBurst(start: number, duration: number, cutoffHz: number, peak: number): void {
    if (!this.noise) return;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
