// Real Paper-Tearing Audio Engine & Web Audio Sound Effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

// -------------------------------------------------------------
// Real Audio File Preloader & Engine for Paper Tearing
// -------------------------------------------------------------

const REAL_TEAR_SOUND_PATHS = [
  '/assets/sounds/paper_tear_crisp.wav',
  '/assets/sounds/paper_tear_perforated.wav',
  '/assets/sounds/paper_tear_thick.wav',
];

let preloadedAudioClips: HTMLAudioElement[] = [];
let currentAudioClipIndex = 0;

export function preloadPaperTearSounds(): void {
  if (typeof window === 'undefined') return;
  if (preloadedAudioClips.length > 0) return;

  preloadedAudioClips = REAL_TEAR_SOUND_PATHS.map((path) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    return audio;
  });
}

// Initialize preloader immediately on browser execution
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    preloadPaperTearSounds();
  } else {
    window.addEventListener('DOMContentLoaded', preloadPaperTearSounds, { once: true });
  }
}

/**
 * Fallback Web Audio Synthesizer:
 * Generates discrete accelerating micro-impulse bursts (25 impulses accelerating over 0.38s)
 * routed through a 500Hz paper-body resonance filter + 1200Hz -> 3600Hz sweeping bandpass filter.
 */
function playSynthesizedPaperTear(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const duration = 0.38;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    const totalImpulses = 25;
    // 25 discrete accelerating impulses (starts slower, accelerates as paper rips across)
    const impulseIndices: number[] = [];
    for (let k = 0; k < totalImpulses; k++) {
      const progress = Math.pow(k / (totalImpulses - 1), 1.6);
      const sampleIdx = Math.min(bufferSize - 1, Math.floor(progress * (bufferSize - 1)));
      impulseIndices.push(sampleIdx);
    }

    // Add fiber-snap micro-impulses
    for (let k = 0; k < impulseIndices.length; k++) {
      const center = impulseIndices[k];
      const burstLength = Math.floor(sampleRate * 0.0035);
      const impulseAmp = 0.6 + 0.4 * (k / totalImpulses);
      for (let j = 0; j < burstLength; j++) {
        const idx = center + j;
        if (idx < bufferSize) {
          const env = Math.exp(-j / (sampleRate * 0.0009));
          const noise = Math.random() * 2 - 1;
          data[idx] += noise * env * impulseAmp;
        }
      }
    }

    // Clamp within [-1, 1]
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i]));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Filter 1: 500Hz paper-body filter
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(500, ctx.currentTime);
    bodyFilter.Q.setValueAtTime(1.8, ctx.currentTime);
    bodyFilter.gain.setValueAtTime(6.0, ctx.currentTime);

    // Filter 2: Sweeping bandpass filter (1200Hz -> 3600Hz)
    const bandpassFilter = ctx.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.setValueAtTime(1200, ctx.currentTime);
    bandpassFilter.frequency.exponentialRampToValueAtTime(3600, ctx.currentTime + duration);
    bandpassFilter.Q.setValueAtTime(2.2, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.75, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    source.connect(bodyFilter);
    bodyFilter.connect(bandpassFilter);
    bandpassFilter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * 1. Real Paper-Tearing Audio Engine
 * Plays real audio recording from /assets/sounds/ (rotating through crisp, perforated, and thick)
 * with 3-step perforated tear haptic pattern [12, 18, 15, 20, 45].
 * Falls back to 25-impulse accelerating Web Audio synthesizer if audio.play() fails.
 */
export function playPaperTearSound(): void {
  try {
    // Perforated 3-step tear haptic pattern
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([12, 18, 15, 20, 45]);
      } catch {}
    }

    if (!isSoundEnabled()) return;

    if (preloadedAudioClips.length === 0) {
      preloadPaperTearSounds();
    }

    if (preloadedAudioClips.length > 0) {
      const audio = preloadedAudioClips[currentAudioClipIndex % preloadedAudioClips.length];
      currentAudioClipIndex = (currentAudioClipIndex + 1) % preloadedAudioClips.length;

      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.9;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Fall back to Web Audio discrete impulse synthesizer
            playSynthesizedPaperTear();
          });
        }
        return;
      }
    }

    // Fallback if no audio elements available
    playSynthesizedPaperTear();
  } catch {
    playSynthesizedPaperTear();
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
