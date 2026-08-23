"use client";

import { createContext, useContext, type ReactNode } from 'react';
import { SETTINGS_DEFAULTS, type Settings } from '@/lib/settings-defaults';

/**
 * Configuration, for the components that render in the browser.
 *
 * Read once server-side in the root layout and handed down, rather than fetched
 * per component. The alternative — every client component querying for the bank
 * details it needs — is a query per component on every page.
 *
 * `email` is deliberately not in what the layout passes down: it holds where
 * staff notifications go and the reminder cadence, which no storefront component
 * needs and no customer should receive in a page payload.
 */
export type PublicSettings = Omit<Settings, 'email'>;

const SettingsContext = createContext<PublicSettings>(SETTINGS_DEFAULTS);

export function SettingsProvider({
  settingsAsString,
  children,
}: {
  settingsAsString: string;
  children: ReactNode;
}) {
  const settings: PublicSettings = settingsAsString
    ? JSON.parse(settingsAsString)
    : SETTINGS_DEFAULTS;

  return (
    <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
  );
}

/**
 * Never throws when there is no provider. A settings read that fails should give
 * a component the defaults, not take the page down — these are shop details, not
 * a session.
 */
export function useSettings(): PublicSettings {
  return useContext(SettingsContext);
}
