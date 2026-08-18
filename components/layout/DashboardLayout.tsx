'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthUser } from '@/lib/auth/server'
import { motion } from 'framer-motion'
import { CreditCard, Heart, LayoutDashboard, LogOut, Package, Settings, Sliders, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect, usePathname } from 'next/navigation'

const navigationItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
  { name: 'Preferences', href: '/dashboard/preferences', icon: Sliders },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];


const DashboardLayout = ({ authUser } : { authUser: AuthUser }) => {
    const pathname = usePathname();
    const { signOut, user, profile } = useAuth();

    if (!user || !profile) {
        return null;
    }   

    if (user?.uid !== authUser.uid) {
        redirect('/auth/login?redirect=/dashboard');
    }


    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <>
              {/* Mobile Navigation - Top Icons */}
      <div className="lg:hidden fixed top-16 md:top-20 left-0 right-0 z-40 bg-white border-b border-foreground/10">
        <div className="flex items-center justify-between px-4 py-3 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative flex flex-col items-center gap-1 min-w-[60px] group"
              >
                <motion.div
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#F8E231]'
                      : 'bg-foreground/5 group-hover:bg-foreground/10'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className={`h-5 w-5 ${
                    isActive ? 'text-black' : 'text-foreground/60'
                  }`} />
                </motion.div>
                <span className={`text-[10px] font-body font-medium ${
                  isActive ? 'text-black' : 'text-foreground/60'
                }`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#F8E231]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-20 bottom-0 w-72 bg-white border-r border-foreground/10 flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {/* User Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 pb-6 border-b border-foreground/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground/5 rounded-full flex items-center justify-center">
                {profile?.photoURL ? 
                <Image
                  src={profile.photoURL}
                  alt="User"
                  width={48}
                  height={48}
                  className="rounded-full object-cover overflow-hidden"
                /> 
                : <User className="h-5 w-5 text-foreground/60" />}
              </div>
              <div>
                <h3 className="font-body font-semibold text-sm">{profile?.displayName || 'User'}</h3>
                <p className="font-body text-xs text-foreground/60">{profile?.email}</p>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                      isActive
                        ? 'bg-[#F8E231]'
                        : 'text-foreground/70 hover:bg-foreground/5'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-black' : ''}`} />
                    <span className={`font-body text-sm font-medium ${isActive ? 'text-black' : ''}`}>
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Logout Button - Sticky at Bottom */}
        <div className="p-3 border-t border-foreground/10">
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-all"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-body text-sm font-medium">Logout</span>
          </motion.button>
        </div>
      </aside>
    </>
    )
}

export default DashboardLayout