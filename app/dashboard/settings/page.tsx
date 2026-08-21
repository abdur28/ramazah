'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { User, Mail, Lock, MapPin, Trash2, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { toast } from 'sonner';
import { deleteUser } from '@/lib/supabase/auth';

export default function SettingsPage() {
  const { user, profile, refetch, signOut } = useAuth();
  const {
    updateProfile,
    changePassword,
    isSavingProfile,
    isUpdatingPassword,
  } = useDashboard();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load user data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
    }
  }, [profile]);

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    const result = await updateProfile({ displayName });
    if (result.success) {
      toast.success('Profile updated successfully!');
      await refetch(user!);
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
      toast.success('Password changed successfully!');
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error || 'Failed to change password');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const result = await deleteUser();

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Account deleted successfully!');
    }

    await signOut();
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="font-heading text-4xl font-light md:text-5xl mb-2">
          SETTINGS
        </h1>
        <p className="font-body text-sm text-ink-muted">
          Manage your account settings and security
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-6 bg-card border border-rule rounded-sm h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-wash rounded-md">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Profile Information</h2>
              <p className="font-body text-sm text-ink-muted">
                Update your personal details
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="mb-2">Display Name</Label>
              <Input 
                id="displayName" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="mb-2">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ''} 
                disabled
                className="bg-wash"
              />
              <p className="text-xs text-ink-muted mt-1">
                Email cannot be changed for security reasons
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="bg-sage-deep text-background hover:bg-foreground hover:text-background transition-colors"
              >
                {isSavingProfile ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full mr-2"
                    />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Shipping Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-fit rounded-sm border border-rule bg-card p-6"
        >
          {/* The form that used to live here edited a single row while
              /dashboard/addresses manages the whole book — two screens writing
              the same table with different models, disagreeing about which
              address is the default one. The book won. */}
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-md bg-wash p-2">
              <MapPin className="h-5 w-5 text-sage-deep" />
            </div>
            <div>
              <h2 className="font-body font-semibold text-foreground">Delivery addresses</h2>
              <p className="font-body text-sm text-ink-muted">
                Saved places you order to
              </p>
            </div>
          </div>

          <p className="max-w-[46ch] font-body text-sm text-ink-muted">
            Addresses live in their own section now, so you can keep more than one — home
            and the shop, say — and choose which is used by default at checkout.
          </p>

          <Link
            href="/dashboard/addresses"
            className="mt-5 inline-flex items-center gap-2 rounded-sm border border-rule px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep"
          >
            Manage addresses
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
                </motion.div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col gap-6">
        {/* Change Password */}
        {profile?.signInMethod === 'email' && <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-6 bg-card border border-rule rounded-sm h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-wash rounded-md">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Change Password</h2>
              <p className="font-body text-sm text-ink-muted">
                Update your account password
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="mb-2">Current Password</Label>
              <div className="relative">
                <Input 
                  id="currentPassword" 
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="mb-2">New Password</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Must be at least 6 characters
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="mb-2">Confirm New Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
                className="bg-sage-deep text-background hover:bg-foreground hover:text-background transition-colors"
              >
                {isUpdatingPassword ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full mr-2"
                    />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
        }

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="p-6 bg-destructive/10 border border-destructive rounded-sm h-fit"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 rounded-md">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-body font-semibold text-destructive">Danger Zone</h2>
              <p className="font-body text-sm text-destructive">
                Irreversible actions
              </p>
            </div>
          </div>

          <div className="bg-card p-4 rounded-md border border-destructive mb-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-sm font-semibold text-destructive">
                  Delete Account
                </p>
                <p className="font-body text-xs text-destructive mt-1">
                  Once you delete your account, there is no going back. This will permanently delete your account data, orders, and wishlist.
                </p>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full bg-destructive hover:bg-destructive"
              >
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className='font-body'>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
        </div>
      </div>
    </div>
  );
}