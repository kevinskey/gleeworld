import { useState, useEffect } from "react";
import { Music, Music2, Music3, Music4 } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const musicNotes = [Music, Music2, Music3, Music4];

interface FloatingNote {
  id: number;
  Icon: typeof Music;
  angle: number;
  delay: number;
  size: number;
}

export const SplashScreen = ({ onComplete, duration = 4000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [notes, setNotes] = useState<FloatingNote[]>([]);

  // Generate floating notes periodically
  useEffect(() => {
    let noteId = 0;
    const interval = setInterval(() => {
      const newNote: FloatingNote = {
        id: noteId++,
        Icon: musicNotes[Math.floor(Math.random() * musicNotes.length)],
        angle: Math.random() * 360,
        delay: Math.random() * 0.3,
        size: 18 + Math.random() * 14,
      };
      setNotes(prev => [...prev.slice(-18), newNote]); // Keep max 18 notes
    }, 180);

    return () => clearInterval(interval);
  }, []);

  // Handle fade out and completion
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 800);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)",
      }}
    >
      {/* Subtle light overlay pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.4) 0%, transparent 50%)`,
        }}
      />

      {/* Floating soft clouds/particles for depth */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-pulse blur-xl"
            style={{
              width: 80 + Math.random() * 120 + "px",
              height: 40 + Math.random() * 60 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: 4 + Math.random() * 3 + "s",
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center">
        {/* Spinning Globe Container */}
        <div className="relative w-56 h-56 md:w-72 md:h-72">
          {/* Outer glow rings */}
          <div 
            className="absolute inset-0 rounded-full animate-spin-slow opacity-40"
            style={{
              background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.5), transparent, rgba(255,255,255,0.5), transparent)",
              animationDuration: "10s",
            }}
          />
          
          {/* Globe glow effect */}
          <div 
            className="absolute inset-4 rounded-full blur-2xl animate-pulse"
            style={{
              background: "radial-gradient(circle, rgba(85,187,238,0.6) 0%, rgba(0,115,201,0.3) 60%, transparent 100%)",
            }}
          />
          
          {/* Main globe - bright Spelman Blue */}
          <div 
            className="absolute inset-8 rounded-full overflow-hidden animate-spin-slow"
            style={{
              background: "radial-gradient(circle at 35% 30%, #7BD4FF 0%, #55BBEE 25%, #0073c9 55%, #0056a6 80%, #003d7a 100%)",
              boxShadow: `
                0 0 80px rgba(85, 187, 238, 0.6),
                0 0 120px rgba(0, 115, 201, 0.4),
                0 0 160px rgba(0, 86, 166, 0.2),
                inset -25px -25px 60px rgba(0, 61, 122, 0.6),
                inset 15px 15px 50px rgba(255, 255, 255, 0.25)
              `,
              animationDuration: "8s",
            }}
          >
            {/* Globe surface details - latitude lines */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`lat-${i}`}
                className="absolute w-full border-t"
                style={{ 
                  top: `${18 + i * 16}%`,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                }}
              />
            ))}
            
            {/* Globe surface details - longitude lines */}
            <div className="absolute inset-0 animate-spin-reverse" style={{ animationDuration: "16s" }}>
              {[...Array(8)].map((_, i) => (
                <div
                  key={`lon-${i}`}
                  className="absolute h-full w-0 border-l left-1/2"
                  style={{ 
                    transform: `rotate(${i * 22.5}deg)`,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                />
              ))}
            </div>
            
            {/* Continent-like shapes for visual interest */}
            <div className="absolute top-[20%] left-[20%] w-[35%] h-[25%] rounded-full bg-white/10 blur-sm" />
            <div className="absolute bottom-[25%] right-[20%] w-[25%] h-[20%] rounded-full bg-white/10 blur-sm" />
            <div className="absolute top-[50%] left-[45%] w-[20%] h-[15%] rounded-full bg-white/8 blur-sm" />
          </div>

          {/* Floating music notes */}
          {notes.map((note) => {
            const radians = (note.angle * Math.PI) / 180;
            const startX = Math.cos(radians) * 70;
            const startY = Math.sin(radians) * 70;
            
            return (
              <div
                key={note.id}
                className="absolute left-1/2 top-1/2 animate-note-float pointer-events-none"
                style={{
                  "--start-x": `${startX}px`,
                  "--start-y": `${startY}px`,
                  "--end-x": `${startX * 3.5}px`,
                  "--end-y": `${startY * 3.5 - 60}px`,
                  animationDelay: `${note.delay}s`,
                } as React.CSSProperties}
              >
                <note.Icon
                  size={note.size}
                  className="drop-shadow-lg"
                  style={{
                    color: "#ffffff",
                    filter: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))",
                  }}
                />
              </div>
            );
          })}

          {/* Sparkle particles */}
          {[...Array(10)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-2.5 h-2.5 rounded-full bg-white animate-sparkle"
              style={{
                left: "50%",
                top: "50%",
                animationDelay: `${i * 0.25}s`,
                "--sparkle-angle": `${i * 36}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Title - Clean modern look */}
        <div className="mt-10 text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <h1 
            className="text-5xl md:text-6xl font-bold tracking-tight"
            style={{
              color: "#ffffff",
              textShadow: "0 2px 20px rgba(0, 86, 166, 0.4)",
            }}
          >
            GleeWorld
          </h1>
          <p 
            className="mt-3 text-base md:text-lg tracking-[0.2em] uppercase font-medium"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            To Amaze & Inspire
          </p>
        </div>

        {/* Loading dots - White for clean look */}
        <div className="mt-8 flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-white animate-bounce"
              style={{ 
                animationDelay: `${i * 0.15}s`,
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
