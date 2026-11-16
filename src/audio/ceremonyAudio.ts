import { AudioConfig } from '../types';

class CeremonyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private ambientTimer: number | null = null;
  private ambientActive = false;
  private spinNodes: AudioNode[] = [];
  private spinTimers: number[] = [];

  private customAmbientEl: HTMLAudioElement | null = null;
  private customSpinEl: HTMLAudioElement | null = null;
  private customWinEl: HTMLAudioElement | null = null;

  private config: AudioConfig = {
    enabled: true,
    ambientEnabled: false,
    masterVolume: 0.72,
  };

  public updateConfig(next: AudioConfig) {
    const prevAmbient = this.config.ambientEnabled;
    this.config = { ...next };

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        next.enabled ? next.masterVolume : 0,
        this.ctx.currentTime,
        0.08
      );
    }

    if (this.customAmbientEl) {
      this.customAmbientEl.volume = next.enabled ? next.masterVolume * 0.65 : 0;
    }

    if (next.enabled && next.ambientEnabled && !prevAmbient) {
      this.startAmbient();
    } else if ((!next.enabled || !next.ambientEnabled) && prevAmbient) {
      this.stopAmbient();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.config.enabled ? this.config.masterVolume : 0;
      this.masterGain.connect(this.ctx.destination);

      // Build warm gala hall impulse response for lush reverb
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createHallImpulse(this.ctx, 2.6, 2.4);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.34;
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createHallImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }
    return impulse;
  }

  private connectWithReverb(node: AudioNode, dryGain = 0.78, wet = true) {
    if (!this.ctx || !this.masterGain) return;
    const dry = this.ctx.createGain();
    dry.gain.value = dryGain;
    node.connect(dry);
    dry.connect(this.masterGain);
    if (wet && this.reverbNode) {
      node.connect(this.reverbNode);
    }
  }

  private playPadChord(freqs: number[], duration: number, peakGain = 0.085, cutoff = 720) {
    const ctx = this.ensureContext();
    if (!ctx || !this.config.enabled) return;
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.value = 0.7;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peakGain, now + Math.min(1.4, duration * 0.3));
    env.gain.setValueAtTime(peakGain * 0.9, now + duration * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.connect(env);
    this.connectWithReverb(env, 0.7, true);

    freqs.forEach((f, idx) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f, now);
      osc2.frequency.setValueAtTime(f * (idx % 2 === 0 ? 1.0025 : 0.9975), now);
      osc1.connect(filter);
      osc2.connect(filter);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    });
  }

  private playHarpNote(freq: number, startTime: number, duration = 2.1, gainVal = 0.09) {
    const ctx = this.ensureContext();
    if (!ctx || !this.config.enabled) return;

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, startTime);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.16, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, startTime);
    filter.frequency.exponentialRampToValueAtTime(650, startTime + duration);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.022);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(env);
    this.connectWithReverb(env, 0.75, true);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.05);
    overtone.stop(startTime + duration + 0.05);
  }

  public startAmbient() {
    if (!this.config.enabled || this.ambientActive) return;
    this.ambientActive = true;

    if (this.config.customAmbientUrl) {
      this.customAmbientEl = new Audio(this.config.customAmbientUrl);
      this.customAmbientEl.loop = true;
      this.customAmbientEl.volume = this.config.masterVolume * 0.65;
      this.customAmbientEl.play().catch(() => {});
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    // Elegant gala progressions: Cmaj9 -> Am9 -> Fmaj9 -> G6
    const progressions = [
      { pad: [130.81, 196.0, 246.94, 293.66, 329.63], arp: [523.25, 659.25, 783.99, 987.77, 1174.66] },
      { pad: [110.0, 164.81, 246.94, 261.63, 329.63], arp: [440.0, 523.25, 659.25, 783.99, 987.77] },
      { pad: [87.31, 174.61, 220.0, 261.63, 329.63], arp: [349.23, 440.0, 523.25, 659.25, 783.99] },
      { pad: [98.0, 196.0, 246.94, 293.66, 329.63], arp: [392.0, 493.88, 587.33, 783.99, 880.0] },
    ];

    let step = 0;
    const playBar = () => {
      if (!this.ambientActive || !this.config.enabled) return;
      const item = progressions[step % progressions.length];
      step++;
      this.playPadChord(item.pad, 4.4, 0.06, 620);

      const now = ctx.currentTime;
      item.arp.forEach((note, idx) => {
        this.playHarpNote(note, now + idx * 0.52 + 0.15, 2.4, 0.045);
      });
    };

    playBar();
    this.ambientTimer = window.setInterval(playBar, 4200);
  }

  public stopAmbient() {
    this.ambientActive = false;
    if (this.ambientTimer !== null) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.customAmbientEl) {
      this.customAmbientEl.pause();
      this.customAmbientEl = null;
    }
  }

  public startSpinCeremony(durationSec = 15) {
    this.stopSpinCeremony();
    if (!this.config.enabled) return;

    // Temporarily pause ambient custom track while spinning
    if (this.customAmbientEl) {
      this.customAmbientEl.volume = this.config.masterVolume * 0.18;
    }

    if (this.config.customSpinUrl) {
      this.customSpinEl = new Audio(this.config.customSpinUrl);
      this.customSpinEl.volume = this.config.masterVolume;
      this.customSpinEl.play().catch(() => {});
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Opening ceremonial gong/chime shimmer
    this.playHarpNote(523.25, now, 3.0, 0.12);
    this.playHarpNote(783.99, now + 0.08, 3.0, 0.1);
    this.playHarpNote(1046.5, now + 0.16, 3.2, 0.09);

    // 2. Warm rising orchestral bed spanning exact durationSec
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.setValueAtTime(340, now);
    bedFilter.frequency.exponentialRampToValueAtTime(1450, now + durationSec * 0.92);

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.0001, now);
    bedGain.gain.linearRampToValueAtTime(0.095, now + 1.8);
    bedGain.gain.linearRampToValueAtTime(0.14, now + durationSec * 0.88);
    bedGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.2);

    bedFilter.connect(bedGain);
    this.connectWithReverb(bedGain, 0.72, true);

    const droneFreqs = [130.81, 196.0, 261.63, 329.63]; // C3, G3, C4, E4
    droneFreqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      // Gentle majestic upward modulation in final 4s
      osc.frequency.setValueAtTime(f, now + Math.max(0, durationSec - 4.5));
      osc.frequency.linearRampToValueAtTime(f * 1.12246, now + durationSec); // subtle lift toward D major feel
      osc.connect(bedFilter);
      osc.start(now);
      osc.stop(now + durationSec + 0.3);
      this.spinNodes.push(osc);
    });

    // 3. Dignified orchestral chord swells & harp accents at key ceremony milestones
    const chordMilestones = [
      { at: 0.1, freqs: [130.81, 196.0, 246.94, 329.63], dur: 4.0 },
      { at: durationSec * 0.27, freqs: [146.83, 220.0, 261.63, 349.23], dur: 4.0 },
      { at: durationSec * 0.53, freqs: [164.81, 246.94, 293.66, 392.0], dur: 4.0 },
      { at: durationSec * 0.78, freqs: [196.0, 246.94, 329.63, 440.0], dur: 3.6 },
    ];

    chordMilestones.forEach((m) => {
      const id = window.setTimeout(() => {
        if (!this.config.enabled) return;
        this.playPadChord(m.freqs, m.dur, 0.075, 900);
      }, m.at * 1000);
      this.spinTimers.push(id);
    });

    // 4. Soft rhythmic timpani heartbeat pulse during middle build-up
    const pulseCount = Math.floor(durationSec / 0.75);
    for (let i = 1; i < pulseCount; i++) {
      const tMs = i * 750;
      const progress = i / pulseCount;
      const id = window.setTimeout(() => {
        if (!this.config.enabled) return;
        this.playSoftTimpani(progress > 0.7 ? 0.11 : 0.065, progress > 0.7 ? 74 : 65);
      }, tMs);
      this.spinTimers.push(id);
    }
  }

  private playSoftTimpani(gainVal = 0.08, freq = 68) {
    const ctx = this.ensureContext();
    if (!ctx || !this.config.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.45, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.09);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(env);
    this.connectWithReverb(env, 0.85, true);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Crystalline tick synced with slot transition; softens & deepens during final deceleration.
   */
  public triggerReelTick(progress: number) {
    if (!this.config.enabled || this.config.customSpinUrl) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    // Scale pitch gracefully from bright crystal to warm bell near finish
    const notes = [880, 987.77, 1046.5, 1174.66, 1318.51];
    const note = progress > 0.75
      ? notes[Math.floor(progress * 10) % notes.length] * 0.75
      : notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, now);

    const vol = progress > 0.7 ? 0.055 : 0.032;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(vol, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, now + (progress > 0.7 ? 0.24 : 0.09));

    osc.connect(env);
    this.connectWithReverb(env, 0.7, progress > 0.65);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public stopSpinCeremony() {
    this.spinTimers.forEach((id) => clearTimeout(id));
    this.spinTimers = [];
    this.spinNodes.forEach((n) => {
      try {
        (n as OscillatorNode).stop();
      } catch {
        // already stopped
      }
    });
    this.spinNodes = [];

    if (this.customSpinEl) {
      this.customSpinEl.pause();
      this.customSpinEl = null;
    }

    if (this.customAmbientEl) {
      this.customAmbientEl.volume = this.config.enabled ? this.config.masterVolume * 0.65 : 0;
    }
  }

  public playWinFanfare() {
    this.stopSpinCeremony();
    if (!this.config.enabled) return;

    if (this.config.customWinUrl) {
      this.customWinEl = new Audio(this.config.customWinUrl);
      this.customWinEl.volume = this.config.masterVolume;
      this.customWinEl.play().catch(() => {});
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Majestic timpani foundation
    this.playSoftTimpani(0.18, 65.41);
    window.setTimeout(() => this.playSoftTimpani(0.14, 98.0), 180);

    // 2. Warm brass-like ceremonial triad -> grand Cmaj9 fanfare resolution
    this.playBrassAccent([261.63, 329.63, 392.0], now, 0.26, 0.09);
    this.playBrassAccent([293.66, 392.0, 493.88], now + 0.22, 0.26, 0.095);
    this.playBrassAccent([261.63, 329.63, 392.0, 493.88, 587.33], now + 0.48, 2.8, 0.12);

    // 3. Ascending golden harp glissando
    const gliss = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98, 2093.0];
    gliss.forEach((freq, idx) => {
      this.playHarpNote(freq, now + 0.45 + idx * 0.075, 2.8, 0.085);
    });
  }

  private playBrassAccent(freqs: number[], start: number, dur: number, gainVal: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, start);
    filter.frequency.exponentialRampToValueAtTime(1700, start + 0.14);
    filter.frequency.exponentialRampToValueAtTime(850, start + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(gainVal, start + 0.06);
    env.gain.setValueAtTime(gainVal * 0.85, start + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    filter.connect(env);
    this.connectWithReverb(env, 0.72, true);

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, start);
      const sub = ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(f, start);

      const sawGain = ctx.createGain();
      sawGain.gain.value = 0.28;
      osc.connect(sawGain);
      sawGain.connect(filter);
      sub.connect(filter);

      osc.start(start);
      sub.start(start);
      osc.stop(start + dur + 0.05);
      sub.stop(start + dur + 0.05);
    });
  }

  public unlock() {
    this.ensureContext();
  }
}

export const ceremonyAudio = new CeremonyAudioEngine();
