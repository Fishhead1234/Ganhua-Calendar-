// Synthesized Web Audio API sound effects for paper tear-off, locked bounce, and wooden ink stamp

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('ganhua_sound_enabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ganhua_sound_enabled', enabled ? 'true' : 'false');
}

export function toggleSoundEnabled(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

/**
 * 1. Realistic Paper-Tear Sound Synthesizer
 * 0.28s white noise through BiquadFilter (bandpass 900Hz -> 2800Hz) with exponential gain envelope
 * + Android Haptic feedback: [15, 25, 40]
 */
export function playPaperTearSound(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 25, 40]);
    }
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const duration = 0.28;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Textured paper tear fiber noise with micro-crinkle modulation
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      const grain = Math.sin(i * 0.22) * 0.4 + 0.6;
      // Crisp initial attack and exponential tear decay
      const envelope = progress < 0.08 ? progress / 0.08 : Math.pow(1 - (progress - 0.08) / 0.92, 1.55);
      data[i] = (Math.random() * 2 - 1) * envelope * grain;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter sweeping up like tearing paper fibers (900Hz -> 2800Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + duration);
    filter.Q.setValueAtTime(2.2, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.38, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch {
    // Ignore audio context restrictions if not yet interacted
  }
}

/**
 * 2. Locked Bounce Sound (Rubber-band Resistance Thud)
 * Short 0.08s low-frequency soft thud (180Hz -> 90Hz) + haptics 15ms
 */
export function playLockedBounceSound(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Ignore audio errors
  }
}

/**
 * 3. Wooden Ink Stamp Sound
 */
export function playStampSound(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([35, 40, 15]);
    }
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  } catch {
    // Ignore audio errors
  }
}
