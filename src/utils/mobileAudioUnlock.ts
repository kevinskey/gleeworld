// Mobile Audio Context Unlock Utility
// iOS/Safari require user interaction to unlock AudioContext

let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;

// Create AudioContext with iOS compatibility
const createAudioContext = (): AudioContext => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported');
  }
  return new AudioContextClass();
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

export const unlockAudioContext = async (): Promise<AudioContext> => {
  const ctx = getSharedAudioContext();
  
  // Fast path: already unlocked
  if (isUnlocked && ctx.state === 'running') {
    return ctx;
  }
  
  // Play silent buffer + tone immediately (synchronous, within user gesture)
  playSilentBuffer(ctx);
  playUnlockTone(ctx);
  
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
  // Fast path: already unlocked and running
  if (isUnlocked && globalAudioContext?.state === 'running') {
    return true;
  }
  
  try {
    const ctx = getSharedAudioContext();
    
    // CRITICAL for iOS: Play silent buffer + tone synchronously within user gesture
    // This must happen BEFORE any async operations
    playSilentBuffer(ctx);
    playUnlockTone(ctx);
    
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
      // Ignore
    }
    
    // Resume context - fire and forget, don't block
    if (ctx.state !== 'running') {
      ctx.resume().then(() => {
        isUnlocked = ctx.state === 'running';
        if (isUnlocked) {
          console.log('✅ Audio context resumed and unlocked');
        }
      }).catch(() => {});
    } else {
      isUnlocked = true;
    }
    
    // Return current state (may not be running yet, but unlock is in progress)
    return ctx.state === 'running';
  } catch (e) {
    console.error('Force unlock failed:', e);
    return false;
  }
};

// Pre-unlock on any user interaction (for iOS)
export const setupMobileAudioUnlock = () => {
  const unlockOnInteraction = () => {
    if (!isUnlocked) {
      console.log('[AudioUnlock] User interaction detected, attempting unlock');
      forceUnlockAudio();
    }
  };
  
  // Listen for various touch/click events (non-passive, fire only once per event type)
  const events: Array<keyof DocumentEventMap> = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
  events.forEach((event) => {
    try {
      document.addEventListener(event, unlockOnInteraction, {
        once: true,
        passive: false,
      });
    } catch (e) {
      // Fallback for older browsers without options support
      document.addEventListener(event, unlockOnInteraction as EventListener);
    }
  });
  
  return () => {
    events.forEach((event) => {
      document.removeEventListener(event, unlockOnInteraction as EventListener);
    });
  };
};
