"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "@studio-freight/lenis";

/**
 * Smooth scrolling, and the switch to turn it off.
 *
 * Lenis drives the page from its own wheel listener and calls `scrollTo` on the
 * window, so `document.body { overflow: hidden }` does not stop it — the usual
 * way of freezing the page behind a modal simply has no effect. Every overlay
 * on this site was affected; the order dialog is where it shows worst, because
 * the dialog is tall enough to want scrolling of its own.
 *
 * The instance is published here so `useScrollLock` can stop and start it.
 */
const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });

    const raf = (time: number) => {
      instance.raf(time);
      frame.current = requestAnimationFrame(raf);
    };
    frame.current = requestAnimationFrame(raf);

    setLenis(instance);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
