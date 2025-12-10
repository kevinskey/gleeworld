// Mobile Audio Context Unlock Utility
// iOS/Safari require user interaction to unlock AudioContext

let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;
let unlockPromise: Promise<void> | null = null;
let unlockAttempts = 0;

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
    console.log('🔊 Created new AudioContext, state:', globalAudioContext.state);
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
    console.log('🔊 Silent buffer failed:', e);
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
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.log('🔊 Unlock tone failed:', e);
  }
};

export const unlockAudioContext = async (): Promise<AudioContext> => {
  const ctx = getSharedAudioContext();
  
  // Fast path: already unlocked
  if (isUnlocked && ctx.state === 'running') {
    return ctx;
  }
  
  // If already unlocking, wait for that
  if (unlockPromise) {
    await unlockPromise;
    return ctx;
  }
  
  unlockPromise = (async () => {
    try {
      unlockAttempts++;
      
      // Play silent buffer immediately (must be during user gesture)
      playSilentBuffer(ctx);
      
      // Resume the context
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play unlock tone (helps on some iOS versions)
      if (ctx.state !== 'running') {
        playUnlockTone(ctx);
        await ctx.resume();
      }
      
      isUnlocked = ctx.state === 'running';
    } catch (error) {
      console.error('❌ Failed to unlock AudioContext:', error);
    } finally {
      unlockPromise = null;
    }
  })();
  
  await unlockPromise;
  return ctx;
};

export const isAudioUnlocked = (): boolean => isUnlocked;

export const getAudioContextState = (): string => {
  return globalAudioContext?.state || 'not-created';
};

// Force unlock - call this directly from a touch/click handler
// Optimized: no delays, fast synchronous unlock
export const forceUnlockAudio = async (): Promise<boolean> => {
  // Fast path: already unlocked
  if (isUnlocked && globalAudioContext?.state === 'running') {
    return true;
  }
  
  try {
    const ctx = getSharedAudioContext();
    
    // Immediately play silent buffer during user gesture
    playSilentBuffer(ctx);
    
    // Resume context (no delay needed)
    if (ctx.state !== 'running') {
      await ctx.resume();
    }
    
    isUnlocked = ctx.state === 'running';
    return isUnlocked;
  } catch (e) {
    console.error('Force unlock failed:', e);
    return false;
  }
};

// Pre-unlock on any user interaction (for iOS)
export const setupMobileAudioUnlock = () => {
  const unlockOnInteraction = async () => {
    if (!isUnlocked) {
      try {
        await forceUnlockAudio();
      } catch {
        // Ignore errors during auto-unlock
      }
    }
  };
  
  // Listen for various touch/click events
  const events = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
  events.forEach(event => {
    document.addEventListener(event, unlockOnInteraction, { once: false, passive: true });
  });
  
  return () => {
    events.forEach(event => {
      document.removeEventListener(event, unlockOnInteraction);
    });
  };
};
