'use client';

import { useEffect } from 'react';
import { useLenis } from '@/components/SmoothScrollProvider';

/**
 * Freeze the page behind an overlay.
 *
 * Two things are needed, not one. `overflow: hidden` on the body stops native
 * scrolling — touch, scrollbar, keyboard — while `lenis.stop()` stops the
 * smooth-scroll loop, which drives the window itself and ignores overflow
 * entirely. Without the second call the page keeps moving under an open dialog
 * and the dialog's own content refuses to scroll.
 *
 * Restores whatever the body had before, rather than assuming 'unset'.
 */
export function useScrollLock(active: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenis?.stop();

    return () => {
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [active, lenis]);
}

export default useScrollLock;
