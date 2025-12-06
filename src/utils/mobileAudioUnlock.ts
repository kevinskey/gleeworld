// Mobile Audio Context Unlock Utility
// iOS/Safari require user interaction to unlock AudioContext

let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;
let unlockPromise: Promise<void> | null = null;
let unlockAttempts = 0;

export const getSharedAudioContext = (): AudioContext => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    isUnlocked = false;
    console.log('🔊 Created new AudioContext, state:', globalAudioContext.state);
  }
  return globalAudioContext;
};

export const unlockAudioContext = async (): Promise<AudioContext> => {
  const ctx = getSharedAudioContext();
  
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
      console.log(`🔊 Attempting to unlock AudioContext (attempt ${unlockAttempts}), current state:`, ctx.state);
      
      // Resume the context first
      if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('🔊 Context resumed, state:', ctx.state);
      }
      
      // Play a silent buffer to fully unlock on iOS
      // This must happen during a user gesture on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      source.stop(0.001);
      
      // Also create and play an oscillator briefly (helps with some iOS versions)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0; // Silent
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(ctx.currentTime + 0.001);
      
      // Wait for iOS to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Double-check the state
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (ctx.state === 'running') {
        isUnlocked = true;
        console.log('✅ AudioContext unlocked successfully, state:', ctx.state);
      } else {
        console.warn('⚠️ AudioContext not running after unlock attempt, state:', ctx.state);
      }
    } catch (error) {
      console.error('❌ Failed to unlock AudioContext:', error);
      throw error;
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
export const forceUnlockAudio = async (): Promise<boolean> => {
  try {
    const ctx = await unlockAudioContext();
    return ctx.state === 'running';
  } catch (e) {
    console.error('Force unlock failed:', e);
    return false;
  }
};

// Pre-unlock on any user interaction (for iOS)
export const setupMobileAudioUnlock = () => {
  const unlockOnInteraction = async (e: Event) => {
    if (!isUnlocked) {
      console.log('🔊 User interaction detected, attempting audio unlock via', e.type);
      try {
        await unlockAudioContext();
      } catch (err) {
        // Ignore errors during auto-unlock, will retry on next interaction
        console.log('🔊 Auto-unlock attempt did not complete, will retry');
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
