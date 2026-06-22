import * as React from "react"

const MOBILE_BREAKPOINT = 1024
const PHONE_BREAKPOINT = 640 // Phones only, excludes tablets
// Tablet covers iPad portrait + landscape and small laptops up to a real
// desktop. The Calendar's three-column layout (filter rail + grid +
// detail panel) doesn't have enough horizontal room until ~1440px, so we
// treat anything ≤1439px as "narrow" and collapse non-essential panels.
const TABLET_BREAKPOINT = 1440

export function useIsMobile() {
  // Initialize synchronously from the viewport so the FIRST paint already
  // knows whether to render the mobile or desktop layout. The previous
  // `undefined → false` startup meant iOS WebViews flashed the desktop
  // layout, then never re-measured (rotation forced a resize event;
  // without rotation the page stayed wider than the phone width).
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Resync once after mount in case the WebView's first innerWidth was
    // stale (Capacitor iOS launch race).
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

/** True for iPad-and-narrower viewports (≤1439px). Lets calendar / dashboard
 *  surfaces collapse a tertiary sidebar without affecting full desktops. */
export function useIsTabletOrNarrower() {
  const [isTablet, setIsTablet] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < TABLET_BREAKPOINT : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth < TABLET_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth < TABLET_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isTablet
}

export function useIsPhone() {
  const [isPhone, setIsPhone] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < PHONE_BREAKPOINT : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsPhone(window.innerWidth < PHONE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsPhone(window.innerWidth < PHONE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isPhone
}
