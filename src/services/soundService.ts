const SOUND_URLS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  shuffle: "https://assets.mixkit.co/active_storage/sfx/1124/1124-preview.mp3",
  card: "https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3",
  fold: "https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3",
  check: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  chips: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  collect: "https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.mp3",
  deal: "https://assets.mixkit.co/active_storage/sfx/1122/1122-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  pop: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3", // Satisfying fallback
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

  play(effect: SoundEffect, volume: number) {
    try {
      const ctx = this.getContext();
      if (!ctx) return false;

      const masterVolume = ctx.createGain();
      masterVolume.gain.setValueAtTime(volume * 0.45, ctx.currentTime);
      masterVolume.connect(ctx.destination);

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
        case 'win': {
          const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const t = now + idx * 0.07;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(gain);
            gain.connect(masterVolume);
            osc.start(t);
            osc.stop(t + 0.29);
          });
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

class SoundService {
  private audios: Partial<Record<SoundEffect, HTMLAudioElement>> = {};
  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.5;
  private synthSFX = new WebAudioSFX();

  constructor() {
    // Enable by default unless toggled off
    this.sfxEnabled = true;
    this.sfxVolume = 0.5;
  }

  play(effect: SoundEffect) {
    if (!this.sfxEnabled) return;

    // 1st Priority: Always trigger the high-fidelity synthesized Web Audio engine
    // to guarantee latency-free, self-contained playability.
    const playedSynth = this.synthSFX.play(effect, this.sfxVolume);

    // 2nd Priority: Load and play real assets in parallel if Web Audio isn't sufficient
    // or if the user override has valid URLs.
    try {
      let audio = this.audios[effect];
      if (!audio) {
        audio = new Audio(SOUND_URLS[effect]);
        this.audios[effect] = audio;
      }
      audio.volume = this.sfxVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Safe check for browser interaction rules - no-op if autoplay blocks
      });
    } catch {
      // Fail silently, synthesized audio handles the playback fallback flawlessly
    }
  }

  toggleSfx(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.sfxVolume = enabled ? 0.5 : 0;
  }

  stopAll() {
    Object.values(this.audios).forEach(audio => {
      try {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch {}
    });
  }

  // Backward compatibility
  toggle(enabled: boolean) {
    this.toggleSfx(enabled);
  }
}

export const soundService = new SoundService();
