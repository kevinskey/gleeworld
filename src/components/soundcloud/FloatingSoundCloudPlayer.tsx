import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, Minimize2, Maximize2, GripHorizontal, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSoundCloudSet, type SoundCloudTrack } from '@/lib/soundcloud';
import { SoundCloudEmbed } from './SoundCloudEmbed';
import { SoundCloudVolume } from './SoundCloudVolume';
import { closeSoundCloudPlayer, useFloatingSoundCloudTrack } from './soundcloudPlayerStore';

const POS_KEY = 'gw:sc-float:pos';
const MIN_HEIGHT = 48;

interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARGIN = 16;
const PREFERRED_WIDTH = 400;

/** Widest the player may be and still leave a margin on both sides. */
const availableWidth = () => Math.max(220, window.innerWidth - MARGIN * 2);

/**
 * Pull a geometry back inside the window.
 *
 * The saved size and position outlive the window they were made in: a player
 * sized on a desktop is replayed verbatim inside the iOS app, and 400px
 * (never mind a resized 800px) does not fit a 390pt phone. Clamp the width
 * first, then the origin against that width, so the box can never start
 * off-screen or end past the right edge.
 */
function clamp(g: Geometry): Geometry {
  const width = Math.min(g.width, availableWidth());
  const height = Math.min(g.height, Math.max(MIN_HEIGHT, window.innerHeight - MARGIN * 2));
  return {
    width,
    height,
    x: Math.min(Math.max(MARGIN, g.x), Math.max(MARGIN, window.innerWidth - width - MARGIN)),
    y: Math.min(Math.max(MARGIN, g.y), Math.max(MARGIN, window.innerHeight - MIN_HEIGHT - MARGIN)),
  };
}

// Free-floating by design: the player spawns bottom-center and the user can
// drag it anywhere in the window — deliberately NOT pinned to a corner like
// the old floating players.
function initialGeometry(url: string): Geometry {
  const width = Math.min(PREFERRED_WIDTH, availableWidth());
  const height = (isSoundCloudSet(url) ? 420 : 220) + MIN_HEIGHT;
  const saved = localStorage.getItem(POS_KEY);
  if (saved) {
    try {
      const g = JSON.parse(saved) as Geometry;
      if (Number.isFinite(g.x) && Number.isFinite(g.y) && Number.isFinite(g.width)) {
        return clamp({ ...g, height });
      }
    } catch { /* fall through to default spawn */ }
  }
  return clamp({
    x: Math.max(MARGIN, (window.innerWidth - width) / 2),
    y: Math.max(MARGIN, window.innerHeight - height - 96),
    width,
    height,
  });
}

function FloatingSoundCloudPlayer({ track }: { track: SoundCloudTrack }) {
  const [geo, setGeo] = useState<Geometry>(() => initialGeometry(track.url));
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const persist = (g: Geometry) => {
    const next = clamp(g);
    setGeo(next);
    localStorage.setItem(POS_KEY, JSON.stringify(next));
  };

  // Rotating the phone, or the keyboard opening, resizes the window under a
  // box that was already placed. `bounds="window"` only constrains dragging.
  useEffect(() => {
    const onResize = () => setGeo((g) => clamp(g));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const content = (
    <Rnd
      position={{ x: geo.x, y: geo.y }}
      size={{ width: geo.width, height: isMinimized ? MIN_HEIGHT : geo.height }}
      // A 320px floor is wider than the usable area on a 320pt phone, which
      // left the box unshrinkable and hanging off the edge.
      minWidth={Math.min(320, availableWidth())}
      minHeight={isMinimized ? MIN_HEIGHT : 180}
      maxWidth={Math.min(800, availableWidth())}
      maxHeight={700}
      bounds="window"
      dragHandleClassName="sc-drag-handle"
      onDragStart={() => setIsDragging(true)}
      onDragStop={(_e, d) => {
        setIsDragging(false);
        persist({ ...geo, x: d.x, y: d.y });
      }}
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        setIsDragging(false);
        if (!isMinimized) {
          persist({
            x: pos.x,
            y: pos.y,
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
        }
      }}
      enableResizing={!isMinimized}
      style={{ zIndex: 999999 }}
    >
      <div className="flex flex-col h-full w-full bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden">
        <div className="sc-drag-handle flex items-center justify-between px-3 py-2 bg-primary cursor-move select-none shrink-0">
          <div className="flex items-center gap-2 text-primary-foreground min-w-0">
            <GripHorizontal className="h-4 w-4 opacity-60 shrink-0" />
            <Music className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium truncate">
              {track.title || 'SoundCloud'}
            </span>
          </div>
          <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized((prev) => !prev);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-primary-foreground hover:bg-destructive hover:text-destructive-foreground rounded"
              onClick={(e) => {
                e.stopPropagation();
                closeSoundCloudPlayer();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title="Close player"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Keep the iframe mounted while minimized so audio keeps playing;
            hidden via class, and inert while dragging so Rnd gets the
            pointer events instead of the widget. */}
        <div
          className={cn(
            'flex-1 bg-black min-h-0',
            isMinimized && 'hidden',
            isDragging && 'pointer-events-none',
          )}
        >
          <SoundCloudEmbed
            url={track.url}
            title={track.title}
            autoPlay
            visual={!isSoundCloudSet(track.url)}
          />
        </div>

        {/* Volume lives outside the widget: the SoundCloud iframe is
            cross-origin, so nothing in the app can attenuate it except the
            widget's own API. Hidden while minimized along with the player.
            Stops pointer events from reaching Rnd so dragging the slider
            doesn't drag the whole window. */}
        {!isMinimized && (
          <div
            className="shrink-0 flex items-center justify-end px-2 py-1.5 bg-card border-t border-border"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SoundCloudVolume />
          </div>
        )}
      </div>
    </Rnd>
  );

  return createPortal(content, document.body);
}

/**
 * App-level host: renders the floating player whenever a track has been
 * detached via detachSoundCloudPlayer(). Keyed by URL so switching tracks
 * remounts the iframe (and its autoplay) cleanly.
 */
export function FloatingSoundCloudPlayerHost() {
  const track = useFloatingSoundCloudTrack();
  if (!track) return null;
  return <FloatingSoundCloudPlayer key={track.url} track={track} />;
}

export default FloatingSoundCloudPlayerHost;
