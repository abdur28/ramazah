"use client";

import { createContext, useContext, useMemo } from "react";
import {
  navigationStructure,
  popularCategories,
  staticNavItems,
  type NavItem,
  type NavLink,
} from "@/constants/navigation";

/**
 * The menu, fetched once on the server and read by every consumer.
 *
 * Five components import the menu — the desktop bar, the mobile sheet, the
 * footer, the search dialog and the cart sheet — and they are all client
 * components. Rather than each one fetching, the root layout resolves it once
 * and hands it down.
 *
 * The hard-coded constants stay as the fallback. If the categories query fails
 * the shop still has a menu, which matters more than the menu being current:
 * a navbar that empties itself during a database blip looks broken in a way a
 * slightly stale one does not.
 */
interface NavigationValue {
  items: NavItem[];
  /** Pages rather than shelves — Contact. Shown after the categories. */
  extras: NavLink[];
  popular: NavLink[];
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({
  navigationAsString,
  children,
}: {
  navigationAsString: string;
  children: React.ReactNode;
}) {
  const value = useMemo<NavigationValue>(() => {
    try {
      const parsed = JSON.parse(navigationAsString) as NavigationValue;
      return {
        items: parsed.items?.length ? parsed.items : navigationStructure,
        extras: parsed.extras?.length ? parsed.extras : staticNavItems,
        popular: parsed.popular?.length ? parsed.popular : popularCategories,
      };
    } catch {
      return { items: navigationStructure, extras: staticNavItems, popular: popularCategories };
    }
  }, [navigationAsString]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  return (
    useContext(NavigationContext) ?? {
      items: navigationStructure,
      extras: staticNavItems,
      popular: popularCategories,
    }
  );
}
