import confetti, { Options as ConfettiOptions } from 'canvas-confetti';

let activeCanvas: HTMLCanvasElement | null = null;
let activeInstance: confetti.CreateTypes | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let activeBurstId = 0;

function ensureCanvasAndInstance(): confetti.CreateTypes | null {
  if (typeof document === 'undefined') return null;

  if (!activeCanvas || !document.body.contains(activeCanvas)) {
    activeCanvas = document.createElement('canvas');
    activeCanvas.setAttribute('aria-hidden', 'true');
    activeCanvas.style.position = 'fixed';
    activeCanvas.style.top = '0';
    activeCanvas.style.left = '0';
    activeCanvas.style.width = '100vw';
    activeCanvas.style.height = '100vh';
    activeCanvas.style.pointerEvents = 'none';
    activeCanvas.style.zIndex = '9999';
    document.body.appendChild(activeCanvas);

    // Disable OffscreenCanvas worker (`useWorker: false`) to prevent Android WebView
    // from freezing confetti frames mid-animation during React re-renders or native bridge calls.
    activeInstance = confetti.create(activeCanvas, {
      resize: true,
      useWorker: false,
    });
  }

  return activeInstance;
}

export function resetConfetti(): void {
  if (cleanupTimer !== null) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  try {
    activeInstance?.reset();
  } catch {
    // ignore
  }
  if (activeCanvas && activeCanvas.parentNode) {
    activeCanvas.parentNode.removeChild(activeCanvas);
  }
  activeCanvas = null;
  activeInstance = null;
}

/**
 * Fires a confetti burst on a main-thread 2D canvas (`useWorker: false`)
 * with guaranteed cleanup so particles can never freeze on screen.
 */
export function fireConfetti(options?: ConfettiOptions): void {
  try {
    const instance = ensureCanvasAndInstance();
    if (!instance) return;

    const burstId = ++activeBurstId;
    if (cleanupTimer !== null) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    const result = instance({
      ticks: 160,
      ...options,
    });

    // Clean up as soon as the animation naturally completes
    if (result && typeof result.then === 'function') {
      result
        .then(() => {
          if (burstId === activeBurstId) {
            resetConfetti();
          }
        })
        .catch(() => {
          if (burstId === activeBurstId) {
            resetConfetti();
          }
        });
    }

    // Hard safety timeout in case requestAnimationFrame is throttled or interrupted
    cleanupTimer = setTimeout(() => {
      if (burstId === activeBurstId) {
        resetConfetti();
      }
    }, 4500);
  } catch {
    // ignore
  }
}
