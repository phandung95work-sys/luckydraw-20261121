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
    // Giai điệu sổ xố: mộc cầm vui, nhịp đều, rồi lắc bóng dồn ở cuối.
    const phrase = [659.25, 783.99, 1046.5, 783.99, 659.25, 880, 783.99, 659.25, 523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 523.25];
    const step = 0.17;
    const melodyUntil = durationSec * 0.8;
    const noteCount = Math.floor(melodyUntil / step);
    for (let i = 0; i < noteCount; i++) {
      const t = now + i * step;
      this.playXylo(phrase[i % phrase.length], t, 0.24, 0.78, true);
      if (i % 2 === 0) this.playClack(t, 0.42, true);
    }

    let rollAt = melodyUntil;
    let gap = 0.11;
    while (rollAt < durationSec - 0.04) {
      this.playClack(now + rollAt, 0.62, true);
      rollAt += gap;
      gap = Math.max(0.032, gap * 0.88);
    }
  }

  /** Mộc cầm khô, to, kiểu nhạc quay số. */
  private playXylo(freq: number, start: number, dur: number, gainVal: number, track: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.config.enabled || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const bright = ctx.createOscillator();
    const brightGain = ctx.createGain();
    const env = ctx.createGain();

    osc.type = 'triangle';
    bright.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    bright.frequency.setValueAtTime(freq * 2, start);
    brightGain.gain.setValueAtTime(0.42, start);

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(gainVal, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(env);
    bright.connect(brightGain);
    brightGain.connect(env);
    env.connect(this.masterGain);

    osc.start(start);
    bright.start(start);
    osc.stop(start + dur + 0.02);
    bright.stop(start + dur + 0.02);
    if (track) this.spinNodes.push(osc, bright);
  }

  /** Tiếng bóng gỗ / lắc lồng quay số. */
  private playClack(start: number, gainVal: number, track: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.config.enabled || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, start);
    osc.frequency.exponentialRampToValueAtTime(180, start + 0.045);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, start);
    filter.Q.value = 6;
    env.gain.setValueAtTime(gainVal, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + 0.07);
    if (track) this.spinNodes.push(osc);
  }

  /**
   * Tiếng bóng gỗ khớp nhịp tên chạy trên vòng quay.
   */
  public triggerReelTick(progress: number) {
    if (!this.config.enabled || this.config.customSpinUrl) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playClack(now, progress > 0.75 ? 0.3 : 0.2, false);
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
    const tune = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1046.5, 1174.66, 1567.98];
    tune.forEach((freq, idx) => {
      this.playXylo(freq, now + idx * 0.1, 0.36, 0.5, false);
    });
    this.playXylo(523.25, now + 0.86, 0.7, 0.28, false);
    this.playXylo(659.25, now + 0.86, 0.7, 0.26, false);
    this.playXylo(783.99, now + 0.86, 0.7, 0.26, false);
    this.playXylo(1046.5, now + 0.86, 0.9, 0.34, false);
    this.playClack(now, 0.28, false);
    this.playClack(now + 0.86, 0.32, false);
  }

  public unlock() {
    this.ensureContext();
  }
}

export const ceremonyAudio = new CeremonyAudioEngine();
