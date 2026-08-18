'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, MapPin, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
import { deleteUser } from '@/lib/firebase/auth';

export default function SettingsPage() {
  const { user, profile, refetch, signOut } = useAuth();
  const { 
    updateProfile, 
    updateAddress, 
    changePassword, 
    isSavingProfile, 
    isSavingAddress, 
    isUpdatingPassword 
  } = useDashboard();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  // Address state
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

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
      
      if (profile.address) {
        setAddress(profile.address);
      }
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

  // Handle address update
  const handleUpdateAddress = async () => {
    // Validation
    if (!address.street || !address.city || !address.zipCode) {
      toast.error('Please fill in all required address fields');
      return;
    }

    const result = await updateAddress(address);
    
    if (result.success) {
      toast.success('Address updated successfully!');
      await refetch(user!);
    } else {
      toast.error(result.error || 'Failed to update address');
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
        <h1 className="font-heading text-4xl md:text-5xl tracking-wider mb-2">
          SETTINGS
        </h1>
        <p className="font-body text-sm text-foreground/60">
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
          className="p-6 bg-white border border-foreground/10 rounded-lg h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-foreground/5 rounded-md">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Profile Information</h2>
              <p className="font-body text-sm text-foreground/60">
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
                className="bg-foreground/5"
              />
              <p className="text-xs text-foreground/60 mt-1">
                Email cannot be changed for security reasons
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="bg-[#F8E231] text-black hover:bg-black hover:text-white transition-colors"
              >
                {isSavingProfile ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"
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
          className="p-6 bg-white border border-foreground/10 rounded-lg h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-foreground/5 rounded-md">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Shipping Address</h2>
              <p className="font-body text-sm text-foreground/60">
                Your primary delivery address
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="mb-2">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="addressPhone" className="mb-2">Phone</Label>
                <Input 
                  id="addressPhone" 
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="street" className="mb-2">Street Address</Label>
              <Input 
                id="street" 
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="mb-2">City</Label>
                <Input 
                  id="city" 
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label htmlFor="state" className="mb-2">State/Province</Label>
                <Input 
                  id="state" 
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zipCode" className="mb-2">ZIP/Postal Code</Label>
                <Input 
                  id="zipCode" 
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
              <div>
                <Label htmlFor="country" className="mb-2">Country</Label>
                <Input 
                  id="country" 
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  placeholder="United States"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleUpdateAddress}
                disabled={isSavingAddress}
                className="bg-[#F8E231] text-black hover:bg-black hover:text-white transition-colors"
              >
                {isSavingAddress ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"
                    />
                    Saving...
                  </>
                ) : (
                  'Save Address'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col gap-6">
        {/* Change Password */}
        {profile?.signInMethod === 'email' && <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-6 bg-white border border-foreground/10 rounded-lg h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-foreground/5 rounded-md">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Change Password</h2>
              <p className="font-body text-sm text-foreground/60">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-foreground/60 mt-1">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={isUpdatingPassword}
                className="bg-[#F8E231] text-black hover:bg-black hover:text-white transition-colors"
              >
                {isUpdatingPassword ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"
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
          className="p-6 bg-red-50 border border-red-200 rounded-lg h-fit"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-md">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-body font-semibold text-red-900">Danger Zone</h2>
              <p className="font-body text-sm text-red-700">
                Irreversible actions
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-red-200 mb-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-sm font-semibold text-red-900">
                  Delete Account
                </p>
                <p className="font-body text-xs text-red-700 mt-1">
                  Once you delete your account, there is no going back. This will permanently delete your account data, orders, and wishlist.
                </p>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
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
                  className="bg-red-600 hover:bg-red-700"
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