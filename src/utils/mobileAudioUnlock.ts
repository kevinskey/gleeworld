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
  // Fast path: already unlocked
  if (isUnlocked && globalAudioContext?.state === 'running') {
    return true;
  }
  
  try {
    const ctx = getSharedAudioContext();
    
    // Immediately play silent buffer + tone during user gesture (synchronous)
    playSilentBuffer(ctx);
    playUnlockTone(ctx);
    
    // Resume context - this is async but we fire and forget
    if (ctx.state !== 'running') {
      ctx.resume().then(() => {
        isUnlocked = ctx.state === 'running';
      });
    } else {
      isUnlocked = true;
    }
    
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
      forceUnlockAudio();
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
