// Mobile Audio Context Unlock Utility
// iOS/Safari require user interaction to unlock AudioContext

let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;
let unlockPromise: Promise<void> | null = null;

export const getSharedAudioContext = (): AudioContext => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    isUnlocked = false;
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
      // Resume the context
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play a silent buffer to fully unlock on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Wait a tiny bit for iOS to process
      await new Promise(resolve => setTimeout(resolve, 10));
      
      isUnlocked = true;
      console.log('✅ AudioContext unlocked, state:', ctx.state);
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

// Pre-unlock on any user interaction (for iOS)
export const setupMobileAudioUnlock = () => {
  const unlockOnInteraction = async () => {
    if (!isUnlocked) {
      try {
        await unlockAudioContext();
      } catch (e) {
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
