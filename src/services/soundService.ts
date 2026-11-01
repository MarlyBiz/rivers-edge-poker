// Effect names. All effects are synthesized locally except the end-of-round clip,
// which is a self-hosted file (public/sounds/round-end.*). No remote audio.
const SOUND_URLS = {
  click: '', shuffle: '', card: '', fold: '', check: '', chips: '',
  collect: '/sounds/round-end', deal: '', tick: '', win: '/sounds/round-end', pop: '',
};

type SoundEffect = keyof typeof SOUND_URLS;

class WebAudioSFX {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  context() { return this.getContext(); }

  play(effect: SoundEffect, volume: number) {
    try {
      const ctx = this.getContext();
      if (!ctx) return false;

      const masterVolume = ctx.createGain();
      // Ramp in over 4ms: an instant jump to full gain produces an audible click.
      masterVolume.gain.setValueAtTime(0, ctx.currentTime);
      masterVolume.gain.linearRampToValueAtTime(volume * 0.45, ctx.currentTime + 0.004);
      masterVolume.connect(ctx.destination);
      setTimeout(() => { try { masterVolume.disconnect(); } catch {} }, 1500);

      const now = ctx.currentTime;

      switch (effect) {
        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(masterVolume);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'pop': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.connect(gain);
          gain.connect(masterVolume);
          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }
        case 'tick': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(masterVolume);
          osc.start(now);
          osc.stop(now + 0.02);
          break;
        }
        case 'shuffle': {
          for (let i = 0; i < 12; i++) {
            const t = now + i * 0.08;
            const bufferSize = ctx.sampleRate * 0.05;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let s = 0; s < bufferSize; s++) {
              data[s] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100 + i * 60, t);
            filter.Q.setValueAtTime(3.5, t);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.22 * (1 - i / 14), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterVolume);

            noise.start(t);
            noise.stop(t + 0.05);
          }
          break;
        }
        case 'card':
        case 'deal':
        case 'fold': {
          const duration = 0.22;
          const bufferSize = ctx.sampleRate * duration;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let s = 0; s < bufferSize; s++) {
            data[s] = Math.random() * 2 - 1;
          }
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1600, now);
          filter.frequency.exponentialRampToValueAtTime(800, now + duration);
          filter.Q.setValueAtTime(1.8, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterVolume);

          noise.start(now);
          noise.stop(now + duration);
          break;
        }
        case 'check': {
          // Double knock tap on wood
          const osc1 = ctx.createOscillator();
          const filter1 = ctx.createBiquadFilter();
          const gain1 = ctx.createGain();
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(115, now);
          filter1.type = 'lowpass';
          filter1.frequency.setValueAtTime(220, now);
          gain1.gain.setValueAtTime(0.75, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
          osc1.connect(filter1);
          filter1.connect(gain1);
          gain1.connect(masterVolume);
          osc1.start(now);
          osc1.stop(now + 0.1);

          const delay = 0.14;
          const osc2 = ctx.createOscillator();
          const filter2 = ctx.createBiquadFilter();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(125, now + delay);
          filter2.type = 'lowpass';
          filter2.frequency.setValueAtTime(220, now + delay);
          gain2.gain.setValueAtTime(0.55, now + delay);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.095);
          osc2.connect(filter2);
          filter2.connect(gain2);
          gain2.connect(masterVolume);
          osc2.start(now + delay);
          osc2.stop(now + delay + 0.1);
          break;
        }
        case 'chips': {
          for (let i = 0; i < 3; i++) {
            const t = now + i * 0.024;
            const osc = ctx.createOscillator();
            const p = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1950 + i * 160, t);
            p.type = 'triangle';
            p.frequency.setValueAtTime(850 - i * 40, t);

            gain.gain.setValueAtTime(0.28 - (i * 0.042), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06 + i * 0.01);

            osc.connect(gain);
            p.connect(gain);
            gain.connect(masterVolume);

            osc.start(t);
            p.start(t);
            osc.stop(t + 0.09);
            p.stop(t + 0.09);
          }
          break;
        }
        case 'collect': {
          for (let i = 0; i < 10; i++) {
            const t = now + i * 0.045;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1600 + (i % 3) * 320 - i * 35, t);

            gain.gain.setValueAtTime(0.24 * (1 - i / 13), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

            osc.connect(gain);
            gain.connect(masterVolume);

            osc.start(t);
            osc.stop(t + 0.05);
          }
          break;
        }
      }
      return true;
    } catch (e) {
      console.error('WebAudioSFX synth play error:', e);
      return false;
    }
  }
}

/**
 * End-of-round sound: one self-hosted, pre-encoded clip (public/sounds/round-end.{ogg,mp3},
 * 44.1 kHz mono, peak -3 dBFS) decoded once into an AudioBuffer and played through a single
 * gain node. Guarded so the store's 'collect' and the table's 'win' (fired a moment apart at
 * showdown) produce exactly one playback.
 */
class RoundEndSound {
  private buffer: AudioBuffer | null = null;
  private loading: Promise<void> | null = null;
  private fallback: HTMLAudioElement | null = null;
  private lastPlayed = 0;
  plays = 0;

  private url() {
    const a = typeof document !== 'undefined' ? document.createElement('audio') : null;
    return a && a.canPlayType('audio/ogg; codecs="vorbis"') ? '/sounds/round-end.ogg' : '/sounds/round-end.mp3';
  }

  preload(ctx: AudioContext | null) {
    if (this.buffer || this.loading || !ctx) return;
    this.loading = fetch(this.url())
      .then(r => r.arrayBuffer())
      .then(data => new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(data, res, rej)))
      .then(buf => { this.buffer = buf; })
      .catch(() => { this.loading = null; });
  }

  play(ctx: AudioContext | null, volume: number) {
    const now = Date.now();
    if (now - this.lastPlayed < 2500) return; // never double-trigger
    this.lastPlayed = now;
    this.plays++;
    if (ctx && this.buffer) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = Math.min(1, volume * 1.4);
      src.buffer = this.buffer;
      src.connect(g);
      g.connect(ctx.destination);
      src.onended = () => { src.disconnect(); g.disconnect(); };
      src.start();
      return;
    }
    // Not decoded yet (first hand / no Web Audio): one preloaded element, restarted.
    this.preload(ctx);
    if (!this.fallback) { this.fallback = new Audio(this.url()); this.fallback.preload = 'auto'; }
    this.fallback.volume = Math.min(1, volume * 1.4);
    this.fallback.currentTime = 0;
    this.fallback.play().catch(() => {});
  }
}

class SoundService {
  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.5;
  private synthSFX = new WebAudioSFX();
  roundEnd = new RoundEndSound();

  constructor() {
    this.sfxEnabled = true;
    this.sfxVolume = 0.5;
  }

  play(effect: SoundEffect) {
    if (!this.sfxEnabled) return;
    if (effect === 'win' || effect === 'collect') {
      const ctx = this.synthSFX.context();
      this.roundEnd.play(ctx, this.sfxVolume);
      return;
    }
    // Synthesized Web Audio only. (Previously every effect ALSO started a hot-linked
    // remote preview MP3 at the same moment, so each sound played twice, out of sync.)
    this.synthSFX.play(effect, this.sfxVolume);
    this.roundEnd.preload(this.synthSFX.context());
  }

  toggleSfx(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.sfxVolume = enabled ? 0.5 : 0;
  }

  stopAll() {}

  // Backward compatibility
  toggle(enabled: boolean) {
    this.toggleSfx(enabled);
  }
}

export const soundService = new SoundService();
if (typeof window !== 'undefined') (window as any).__rivSound = soundService;
