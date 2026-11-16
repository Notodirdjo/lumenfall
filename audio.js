// All of LUMENFALL's sound is synthesized with the Web Audio API: no audio
// files are shipped. The context is created on the first user gesture (the
// Start button), which is what browsers require.

const MUTE_KEY = 'lumenfall-muted';

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  // Call from a click handler. Safe to call repeatedly.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.4;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Storage unavailable: the setting just won't persist.
    }
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.4, this.ctx.currentTime);
    }
  }

  // A short oscillator blip. freq slides toward freqEnd when given.
  tone({ freq, freqEnd, dur, type = 'sine', gain = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Filtered noise, for impacts and explosions.
  noise({ dur, gain = 0.2, freq = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  click() {
    this.tone({ freq: 660, freqEnd: 520, dur: 0.07, type: 'triangle', gain: 0.12 });
  }
  deny() {
    this.tone({ freq: 180, freqEnd: 120, dur: 0.14, type: 'square', gain: 0.1 });
  }
  place() {
    this.tone({ freq: 320, freqEnd: 180, dur: 0.12, type: 'triangle', gain: 0.2 });
    this.noise({ dur: 0.06, gain: 0.08, freq: 900 });
  }
  upgrade() {
    this.tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.16 });
    this.tone({ freq: 784, dur: 0.14, type: 'triangle', gain: 0.16, delay: 0.08 });
  }
  sell() {
    this.tone({ freq: 784, freqEnd: 523, dur: 0.1, type: 'triangle', gain: 0.14 });
  }
  shoot(kind) {
    if (kind === 'prism') {
      this.tone({ freq: 880 + Math.random() * 120, freqEnd: 660, dur: 0.06, type: 'sine', gain: 0.06 });
    } else if (kind === 'frost') {
      this.tone({ freq: 1200, freqEnd: 900, dur: 0.09, type: 'sine', gain: 0.05 });
    } else if (kind === 'pulse') {
      this.tone({ freq: 220, freqEnd: 90, dur: 0.12, type: 'sine', gain: 0.14 });
      this.noise({ dur: 0.08, gain: 0.06, freq: 700 });
    } else if (kind === 'lance') {
      this.tone({ freq: 1400, freqEnd: 300, dur: 0.12, type: 'sawtooth', gain: 0.07 });
    }
  }
  hit() {
    this.noise({ dur: 0.05, gain: 0.05, freq: 1600 });
  }
  kill() {
    this.tone({ freq: 520, freqEnd: 760, dur: 0.08, type: 'triangle', gain: 0.08 });
  }
  leak() {
    this.tone({ freq: 220, freqEnd: 110, dur: 0.3, type: 'sawtooth', gain: 0.16 });
  }
  waveStart() {
    this.tone({ freq: 392, dur: 0.12, type: 'triangle', gain: 0.14 });
    this.tone({ freq: 523, dur: 0.16, type: 'triangle', gain: 0.14, delay: 0.1 });
  }
  waveClear() {
    this.tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.14 });
    this.tone({ freq: 659, dur: 0.1, type: 'triangle', gain: 0.14, delay: 0.09 });
    this.tone({ freq: 784, dur: 0.16, type: 'triangle', gain: 0.14, delay: 0.18 });
  }
  dawn() {
    this.tone({ freq: 220, freqEnd: 880, dur: 0.5, type: 'sine', gain: 0.18 });
    this.noise({ dur: 0.4, gain: 0.1, freq: 2400 });
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.16, delay: i * 0.13 });
    });
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.15, delay: i * 0.16 });
    });
  }
}
