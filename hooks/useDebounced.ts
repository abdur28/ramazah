"use client";

import { useEffect, useState } from "react";

/**
 * A value that lags behind, for search boxes that now hit the database.
 *
 * While the admin lists filtered in the browser, typing was free — every
 * keystroke re-ran a `useMemo` over an array already in memory. Server-side
 * search changes the arithmetic: without this, "cardamom" is eight requests,
 * seven of them for prefixes nobody wanted, and the answers can arrive out of
 * order so the results settle on "cardamo".
 *
 * 300ms is about the gap between words when typing normally, so a search fires
 * when you pause rather than while you are still going.
 */
export default function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
