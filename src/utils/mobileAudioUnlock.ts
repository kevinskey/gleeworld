// Mobile Audio Context Unlock Utility
// iOS/Safari and PWAs require user interaction to unlock AudioContext

let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;
let setupComplete = false;

// Detect if running as a PWA (standalone mode)
const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// Create AudioContext with iOS/PWA compatibility
const createAudioContext = (): AudioContext => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported');
  }
  
  // For PWA on iOS, use specific sample rate that works better
  const options = isPWA() ? { sampleRate: 44100 } : undefined;
  return new AudioContextClass(options);
};

export const getSharedAudioContext = (): AudioContext => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = createAudioContext();
    isUnlocked = false;
  }
  return globalAudioContext;
};

// iOS-specific: Play a silent buffer immediately during user gesture
const playSilentBuffer = (ctx: AudioContext): void => {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    // Ignore
  }
};

// iOS-specific: Play a very quiet oscillator to fully unlock
const playUnlockTone = (ctx: AudioContext): void => {
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 1;
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Ignore
  }
};

// PWA-specific: Create and play a silent HTML5 audio element
// This helps unlock audio on iOS PWAs where AudioContext alone may not work
const playHtml5SilentAudio = (): void => {
  try {
    // Create a data URL for a tiny silent MP3
    const silentMp3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+xDEAAPAAADSAAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMQpg8AAAaQAAAAAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    
    const audio = new Audio(silentMp3);
    audio.volume = 0.001;
    audio.muted = false;
    
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        audio.pause();
        audio.remove?.();
        console.log('[AudioUnlock] HTML5 silent audio played successfully');
      }).catch(() => {
        // Ignore - just an additional unlock attempt
      });
    }
  } catch (e) {
    // Ignore
  }
};

export const unlockAudioContext = async (): Promise<AudioContext> => {
  const ctx = getSharedAudioContext();
  
  // Fast path: already unlocked
  if (isUnlocked && ctx.state === 'running') {
    return ctx;
  }
  
  // Play silent buffer + tone immediately (synchronous, within user gesture)
  playSilentBuffer(ctx);
  playUnlockTone(ctx);
  
  // For PWAs, also try HTML5 audio unlock
  if (isPWA()) {
    playHtml5SilentAudio();
  }
  
  // Resume the context
  if (ctx.state !== 'running') {
    await ctx.resume();
  }
  
  isUnlocked = ctx.state === 'running';
  return ctx;
};

export const isAudioUnlocked = (): boolean => isUnlocked;

export const getAudioContextState = (): string => {
  return globalAudioContext?.state || 'not-created';
};

// Force unlock - call this directly from a touch/click handler
// Must be synchronous within user gesture for iOS
export const forceUnlockAudio = (): boolean => {
  const isPwaMode = isPWA();
  console.log('[AudioUnlock] forceUnlockAudio called. PWA:', isPwaMode, 'Current state:', {
    hasContext: !!globalAudioContext,
    state: globalAudioContext?.state || 'not-created',
    isUnlocked,
  });

  // Fast path: already unlocked and running
  if (isUnlocked && globalAudioContext?.state === 'running') {
    console.log('[AudioUnlock] Already unlocked and running');
    return true;
  }
  
  try {
    const ctx = getSharedAudioContext();
    console.log('[AudioUnlock] Got shared AudioContext with state:', ctx.state);
    
    // CRITICAL for iOS: Play silent buffer + tone synchronously within user gesture
    // This must happen BEFORE any async operations
    playSilentBuffer(ctx);
    playUnlockTone(ctx);
    
    // For PWAs, also try HTML5 audio unlock - this is critical for iOS PWAs
    if (isPwaMode) {
      playHtml5SilentAudio();
    }
    
    // Also try creating and playing an oscillator directly (another iOS unlock method)
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.01);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.01);
    } catch (e) {
      console.warn('[AudioUnlock] Error during unlock oscillator:', e);
    }
    
    // Resume context - fire and forget, don't block
    if (ctx.state !== 'running') {
      ctx.resume().then(() => {
        isUnlocked = ctx.state === 'running';
        console.log('[AudioUnlock] Resume resolved. New state:', ctx.state, 'isUnlocked:', isUnlocked);
        if (isUnlocked) {
          console.log('✅ Audio context resumed and unlocked');
        }
      }).catch((err) => {
        console.error('[AudioUnlock] ctx.resume() failed:', err);
      });
    } else {
      isUnlocked = true;
      console.log('[AudioUnlock] Context already running, marking as unlocked');
    }
    
    // Return current state (may not be running yet, but unlock is in progress)
    return ctx.state === 'running';
  } catch (e) {
    console.error('Force unlock failed:', e);
    return false;
  }
};

// Pre-unlock on any user interaction (for iOS and PWAs)
export const setupMobileAudioUnlock = (): (() => void) => {
  // Prevent duplicate setup
  if (setupComplete) {
    return () => {};
  }
  
  const unlockOnInteraction = () => {
    if (!isUnlocked) {
      console.log('[AudioUnlock] User interaction detected, attempting unlock. PWA:', isPWA());
      forceUnlockAudio();
    }
  };
  
  // Listen for various touch/click events
  // Use capture phase to catch events early
  const events: Array<keyof DocumentEventMap> = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
  
  events.forEach((event) => {
    try {
      // Don't use { once: true } - we want to retry on each interaction until unlocked
      document.addEventListener(event, unlockOnInteraction, {
        capture: true,
        passive: true,
      });
    } catch (e) {
      // Fallback for older browsers without options support
      document.addEventListener(event, unlockOnInteraction as EventListener);
    }
  });
  
  // Also listen on window for PWA edge cases
  if (isPWA()) {
    window.addEventListener('touchstart', unlockOnInteraction, { capture: true, passive: true });
    window.addEventListener('click', unlockOnInteraction, { capture: true, passive: true });
  }
  
  setupComplete = true;
  console.log('[AudioUnlock] Mobile audio unlock setup complete. PWA mode:', isPWA());
  
  return () => {
    events.forEach((event) => {
      document.removeEventListener(event, unlockOnInteraction as EventListener);
    });
    if (isPWA()) {
      window.removeEventListener('touchstart', unlockOnInteraction as EventListener);
      window.removeEventListener('click', unlockOnInteraction as EventListener);
    }
    setupComplete = false;
  };
};

// Auto-setup when module loads (critical for PWAs)
if (typeof window !== 'undefined') {
  // Setup immediately when the module loads
  setupMobileAudioUnlock();
}
