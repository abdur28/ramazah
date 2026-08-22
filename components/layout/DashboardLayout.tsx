'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthUser } from '@/lib/auth/server'
import { motion } from 'framer-motion'
import { Heart, LayoutDashboard, LogOut, MapPin, Package, Search, Settings, Sliders, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect, usePathname } from 'next/navigation'

/**
 * The account shell: a rail on desktop, a row of tabs on a phone.
 *
 * The active item used to be `bg-sage-deep` with `text-foreground` — ink on
 * deep sage, which measures 2.28:1. That is the exact pairing the design system
 * exists to prevent (sage is a surface; deep sage is the interactive colour and
 * takes a light label). Active items are now cream on sage-deep at 5.78:1.
 */
const navigationItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
  { name: 'Requests', href: '/dashboard/requests', icon: Search },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Addresses', href: '/dashboard/addresses', icon: MapPin },
  { name: 'Preferences', href: '/dashboard/preferences', icon: Sliders },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const DashboardLayout = ({ authUser }: { authUser: AuthUser }) => {
  const pathname = usePathname();
  const { signOut, user, profile } = useAuth();

  if (!user || !profile) {
    return null;
  }

  if (user?.id !== authUser.uid) {
    redirect('/auth/login?redirect=/dashboard');
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = profile?.displayName || user.email?.split('@')[0] || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Phone: a scrolling row of tabs under the navbar. */}
      <div className="fixed inset-x-0 top-16 z-40 border-b border-rule bg-card md:top-20 lg:hidden print:hidden">
        <div data-lenis-prevent
          className="flex items-center gap-1 overflow-x-auto px-3 py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 font-body text-[13px] transition-colors ${
                  isActive
                    ? 'bg-sage-deep text-background'
                    : 'text-ink-muted hover:bg-wash hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="fixed bottom-0 left-0 top-20 hidden w-72 flex-col border-r border-rule bg-card lg:flex print:hidden">
        <div data-lenis-prevent
          className="flex-1 overflow-y-auto px-5 py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border-b border-rule pb-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wash font-body text-sm text-sage-deep">
                {profile?.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt=""
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-body text-sm text-foreground">
                  {displayName}
                </span>
                <span className="block truncate font-body text-xs text-ink-muted">
                  {profile?.email}
                </span>
              </span>
            </div>
          </motion.div>

          <h2 className="mb-3 px-3 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Account
          </h2>

          <nav className="space-y-0.5">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 font-body text-sm transition-colors ${
                      isActive
                        ? 'bg-sage-deep text-background'
                        : 'text-ink-muted hover:bg-wash hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-rule p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 font-body text-sm text-ink-muted transition-colors hover:bg-wash hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export default DashboardLayout
