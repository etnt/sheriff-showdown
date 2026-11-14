/**
 * Synthesized sound effects built with WebAudio. No asset files: every
 * sound is an oscillator or a burst of noise.
 *
 * Browsers block audio until the user interacts with the page, so the
 * AudioContext is created lazily by `unlock()`, which the caller invokes
 * on the first input. Until then every play call is a silent no-op.
 */

export type SoundName =
  | 'shot'
  | 'villainHit'
  | 'citizenHit'
  | 'villainFired'
  | 'cock'
  | 'gameOver';

export class Sound {
  private ctx: AudioContext | null = null;
  /** Everything passes through here; zero when muted. */
  private out: GainNode | null = null;
  /** Sound effects bus. */
  private master: GainNode | null = null;
  /** Background ambience bus. */
  private ambience: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private ambienceOn = false;

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
      this.out = this.ctx.createGain();
      this.out.gain.value = this.muted ? 0 : 1;
      this.out.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.out);
      this.ambience = this.ctx.createGain();
      this.ambience.gain.value = 0.6;
      this.ambience.connect(this.out);
      this.noise = this.makeNoise(this.ctx);
      // Do not play (or burn battery) while the tab is hidden.
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
      this.startAmbience();
    } catch {
      this.ctx = null;
    }
  }

  /** Flip mute on or off; returns the new state. Works before unlock. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 1;
    return this.muted;
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
      case 'cock':
        // Two quick clicks: a hammer being drawn back.
        this.noiseBurst(t, 0.025, 6000, 0.5);
        this.noiseBurst(t + 0.09, 0.03, 4000, 0.6);
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

  // --- Background ambience ---------------------------------------------
  // Wind (always on), plus random creaking signs and a far-off saloon
  // piano. All of it is synthesized, so there are no audio files.

  private startAmbience(): void {
    if (this.ambienceOn || !this.ctx || !this.ambience || !this.noise) return;
    this.ambienceOn = true;
    const ctx = this.ctx;

    // Wind: looping noise, bandpass swept by two slow LFOs.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.12;
    wind.connect(band).connect(windGain).connect(this.ambience);

    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.08;
    const sweepDepth = ctx.createGain();
    sweepDepth.gain.value = 260;
    sweep.connect(sweepDepth).connect(band.frequency);

    const gust = ctx.createOscillator();
    gust.frequency.value = 0.13;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.07;
    gust.connect(gustDepth).connect(windGain.gain);

    // Low rumble under the wind.
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noise;
    rumble.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 160;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.1;
    rumble.connect(low).connect(rumbleGain).connect(this.ambience);

    for (const node of [wind, rumble, sweep, gust]) node.start();

    this.scheduleCreak(4 + Math.random() * 4);
    this.schedulePiano(6 + Math.random() * 6);
  }

  private scheduleCreak(delaySec: number): void {
    window.setTimeout(() => {
      this.creak();
      this.scheduleCreak(8 + Math.random() * 12);
    }, delaySec * 1000);
  }

  /** A wooden sign swinging on rusty hinges. */
  private creak(): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambience || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const dur = 0.7 + Math.random() * 0.6;
    const base = 150 + Math.random() * 80;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 0.78, t + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(base * 0.92, t + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 720;
    filter.Q.value = 9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + dur * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(gain).connect(this.ambience);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private schedulePiano(delaySec: number): void {
    window.setTimeout(() => {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') {
        this.schedulePiano(3); // Not audible right now: try again soon.
        return;
      }
      const length = this.playPhrase();
      this.schedulePiano(length + 8 + Math.random() * 10);
    }, delaySec * 1000);
  }

  /** Play one short tinkling phrase; returns its length in seconds. */
  private playPhrase(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    // [midi note, length in eighth notes]
    const phrases: ReadonlyArray<{ notes: Array<[number, number]>; roots: number[] }> = [
      {
        notes: [[72, 1], [76, 1], [79, 1], [76, 1], [81, 2], [79, 1], [77, 1], [76, 2], [74, 2], [72, 4]],
        roots: [48, 53, 55, 48],
      },
      {
        notes: [[67, 1], [71, 1], [74, 1], [71, 1], [76, 2], [74, 1], [72, 1], [71, 2], [69, 2], [67, 4]],
        roots: [43, 48, 50, 43],
      },
      {
        notes: [[76, 2], [74, 1], [72, 1], [74, 2], [72, 1], [69, 1], [67, 2], [69, 2], [72, 4]],
        roots: [48, 43, 45, 48],
      },
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    if (!phrase) return 0;
    const step = 0.2; // seconds per eighth note
    let t = ctx.currentTime + 0.05;
    let eighths = 0;
    for (const [midi, len] of phrase.notes) {
      this.pluck(midi, t, len * step * 0.95);
      t += len * step;
      eighths += len;
    }
    // Left hand: root, fifth, root, fifth.
    for (let i = 0; i < eighths; i += 2) {
      const root = phrase.roots[Math.floor(i / 8) % phrase.roots.length] ?? 48;
      const note = (i / 2) % 2 === 0 ? root : root + 7;
      this.pluck(note, ctx.currentTime + 0.05 + i * step, 0.35);
    }
    return eighths * step;
  }

  /** One honky-tonk piano note: two slightly detuned oscillators. */
  private pluck(midi: number, start: number, duration: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambience) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1700; // muffled, as if heard through walls
    const gain = ctx.createGain();
    const end = start + Math.max(duration, 0.2) * 1.6;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    filter.connect(gain).connect(this.ambience);
    for (const [type, cents] of [['triangle', 0], ['square', 9]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const level = ctx.createGain();
      level.gain.value = type === 'square' ? 0.25 : 1;
      osc.connect(level).connect(filter);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
