// Mounts the TourEngine over the real DashboardShell. Persists active +
// current-step state in sessionStorage so the tour survives DashboardShell
// remounts (each /dashboard/* route mounts its own DashboardShell
// instance, so the engine's internal state would otherwise reset every
// time the script calls navigate()).
//
// Activation: visit any /dashboard/* URL with ?tour=admin. The param is
// converted into sessionStorage so the rest of the navigation can drop it.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TourEngine } from './TourEngine';
import { buildAdminProductTour } from './productTourScript';

const ACTIVE_KEY = 'gw-product-tour-active';
const STEP_KEY = 'gw-product-tour-step';

function readStoredActive(): boolean {
  try {
    return sessionStorage.getItem(ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}
function readStoredStep(): number {
  try {
    const n = parseInt(sessionStorage.getItem(STEP_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function ProductTour() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tourParam = params.get('tour');

  // Active state: kicked on by URL param, then promoted into sessionStorage
  // so subsequent navigations can drop the param and we still know the
  // tour should run.
  const [active, setActive] = useState<boolean>(() => tourParam === 'admin' || readStoredActive());
  const [initialStepIndex] = useState<number>(() => readStoredStep());

  useEffect(() => {
    if (tourParam === 'admin') {
      try {
        sessionStorage.setItem(ACTIVE_KEY, '1');
      } catch {
        /* ignore */
      }
      setActive(true);
      // Strip the param so future navigate() calls don't have to preserve it.
      setParams(
        (prev) => {
          prev.delete('tour');
          return prev;
        },
        { replace: true },
      );
    }
  }, [tourParam, setParams]);

  const steps = useMemo(() => buildAdminProductTour({ navigate }), [navigate]);

  const stop = () => {
    setActive(false);
    try {
      sessionStorage.removeItem(ACTIVE_KEY);
      sessionStorage.removeItem(STEP_KEY);
    } catch {
      /* ignore */
    }
  };

  const persistStep = (i: number) => {
    try {
      sessionStorage.setItem(STEP_KEY, String(i));
    } catch {
      /* ignore */
    }
  };

  if (!active) return null;
  return (
    <TourEngine
      steps={steps}
      initialStepIndex={initialStepIndex}
      onStepChange={persistStep}
      onComplete={stop}
      onDismiss={stop}
    />
  );
}
