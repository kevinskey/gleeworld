import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SUPABASE_URL } from '@/integrations/supabase/client';

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; reason: string }
  | { kind: 'ready'; slip: any; student: any; guardian: any; trip: any }
  | { kind: 'submitted' };

export default function ParentPermissionSlip() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drewSomething = useRef(false);
  // Force re-render to update canSubmit after first pointer stroke
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', reason: 'invalid' });
      return;
    }
    fetch(`${FUNCTIONS_BASE}/verify-permission-slip-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) setState({ kind: 'error', reason: d.reason ?? 'invalid' });
        else setState({ kind: 'ready', slip: d.slip, student: d.student, guardian: d.guardian, trip: d.trip });
      })
      .catch(() => setState({ kind: 'error', reason: 'invalid' }));
  }, [token]);

  useEffect(() => {
    if (state.kind !== 'ready') return;
    attachCanvas(canvasRef.current, () => {
      drewSomething.current = true;
      forceUpdate(n => n + 1);
    });
  }, [state.kind]);

  if (state.kind === 'loading') {
    return (
      <p style={{ padding: 24, fontFamily: 'system-ui', color: '#444' }}>
        Loading…
      </p>
    );
  }
  if (state.kind === 'error') {
    return <ErrorScreen reason={state.reason} />;
  }
  if (state.kind === 'submitted') {
    return (
      <p style={{ padding: 24, fontFamily: 'system-ui', color: '#111', fontSize: 16 }}>
        Thanks — your child's teacher has been notified.
      </p>
    );
  }

  const { student, trip, guardian } = state;
  const canSubmit = drewSomething.current && typedName.trim().length > 1 && agreed && !submitting;

  async function submit() {
    if (!canvasRef.current) return;
    setSubmitting(true);
    const png = canvasRef.current.toDataURL('image/png');
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/parent-sign-permission-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature_png_base64: png, typed_name: typedName }),
      }).then(r => r.json());
      if (res.ok) {
        setState({ kind: 'submitted' });
      } else {
        alert(`Sign failed: ${res.reason ?? 'unknown error'}`);
        setSubmitting(false);
      }
    } catch {
      alert('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'system-ui', color: '#111' }}>
      <h1 style={{ fontSize: 20, marginTop: 8, marginBottom: 4 }}>
        Permission slip for {student?.full_name}
      </h1>

      <section style={{ background: '#f8f5ee', padding: 12, borderRadius: 8, marginTop: 12 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{trip?.title}</p>
        {trip?.location && (
          <p style={{ margin: '4px 0', color: '#555' }}>{trip.location}</p>
        )}
        {(trip?.start_date || trip?.end_date) && (
          <p style={{ margin: '4px 0', color: '#555' }}>
            {trip?.start_date}
            {trip?.start_date && trip?.end_date ? ' – ' : ''}
            {trip?.end_date}
          </p>
        )}
        {trip?.description && (
          <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', color: '#333', lineHeight: 1.5 }}>
            {trip.description}
          </p>
        )}
      </section>

      <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8 }}>Sign below</h2>
      <canvas
        ref={canvasRef}
        width={448}
        height={160}
        style={{
          border: '1px solid #ccc',
          borderRadius: 4,
          width: '100%',
          background: '#fff',
          touchAction: 'none',
          display: 'block',
        }}
      />
      <button
        type="button"
        onClick={() => {
          clearCanvas(canvasRef.current!);
          drewSomething.current = false;
          forceUpdate(n => n + 1);
        }}
        style={{
          marginTop: 6,
          fontSize: 13,
          color: '#555',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          textDecoration: 'underline',
        }}
      >
        Clear signature
      </button>

      <label style={{ display: 'block', marginTop: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Your full name</span>
        <input
          value={typedName}
          onChange={e => setTypedName(e.target.value)}
          placeholder="Type your full name"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 10px',
            marginTop: 6,
            fontSize: 15,
            border: '1px solid #ccc',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>
          I am {guardian?.name ?? 'the guardian'} and I authorize{' '}
          {student?.full_name ?? 'my child'} to travel on this trip.
        </span>
      </label>

      <button
        disabled={!canSubmit}
        onClick={submit}
        style={{
          marginTop: 20,
          padding: '14px 20px',
          background: canSubmit ? '#111' : '#999',
          color: '#fff',
          border: 0,
          borderRadius: 6,
          width: '100%',
          fontSize: 16,
          fontWeight: 600,
          cursor: canSubmit ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit permission slip'}
      </button>
    </main>
  );
}

function ErrorScreen({ reason }: { reason: string }) {
  const msg =
    reason === 'expired'
      ? 'This link has expired. Contact your teacher for a new one.'
      : reason === 'already_signed'
      ? 'This permission slip is already signed. Thank you.'
      : reason === 'revoked'
      ? 'This link is no longer valid. Contact your teacher.'
      : 'This link is not valid.';
  return (
    <p style={{ padding: 24, fontFamily: 'system-ui', color: '#444', fontSize: 15 }}>
      {msg}
    </p>
  );
}

function attachCanvas(c: HTMLCanvasElement | null, onDraw: () => void) {
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#111';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let drawing = false;
  let last: { x: number; y: number } | null = null;

  const pos = (e: PointerEvent) => {
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  c.onpointerdown = e => {
    drawing = true;
    last = pos(e);
    c.setPointerCapture(e.pointerId);
    onDraw();
  };

  c.onpointermove = e => {
    if (!drawing || !last) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  };

  c.onpointerup = () => {
    drawing = false;
    last = null;
  };

  c.onpointercancel = () => {
    drawing = false;
    last = null;
  };
}

function clearCanvas(c: HTMLCanvasElement) {
  c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
}
