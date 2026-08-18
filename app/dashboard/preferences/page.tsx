'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, DollarSign } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, usePreferences } from '@/hooks/useDashboard';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { availableCurrencies } from '@/constants';
import { CurrencyCode } from '@/types/types';

export default function PreferencesPage() {
  const { user, refetch } = useAuth();
  const { savePreferences, isSavingPreferences, loadPreferences } = useDashboard();
  const storedPreferences = usePreferences();
  
  const [emailNotifications, setEmailNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newArrivals: false,
    wishlistAlerts: true,
    newsletter: true,
  });

  const { selectedCurrency, setSelectedCurrency, currency } = useCurrency();

  // Load preferences when component mounts or preferences change
  useEffect(() => {
    if (storedPreferences) {
      setEmailNotifications(storedPreferences.emailNotifications);
    }
  }, [storedPreferences]);

  // Load preferences on mount if user exists
  useEffect(() => {
    if (user && !storedPreferences) {
      loadPreferences(user.uid);
    }
  }, [user, storedPreferences, loadPreferences]);

  const handleCurrencyChange = (currencyCode: CurrencyCode) => {
    setSelectedCurrency(currencyCode);
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    
    const preferences = {
      emailNotifications,
    };

    const result = await savePreferences(user.uid, preferences);
    
    if (result.success) {
      toast.success('Preferences saved successfully!');
      await refetch(user);
    } else {
      toast.error('Failed to save preferences. Please try again.');
    }
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
          PREFERENCES
        </h1>
        <p className="font-body text-sm text-foreground/60">
          Customize your shopping experience
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Notifications - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 p-6 bg-white border border-foreground/10 rounded-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-foreground/5 rounded-md">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-body font-semibold">Email Notifications</h2>
              <p className="font-body text-sm text-foreground/60">
                Manage your email preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'orderUpdates',
                label: 'Order Updates',
                description: 'Get updates about your order status',
              },
              {
                key: 'promotions',
                label: 'Promotions & Offers',
                description: 'Exclusive deals and discount codes',
              },
              {
                key: 'newArrivals',
                label: 'New Arrivals',
                description: 'Be first to know about new products',
              },
              {
                key: 'wishlistAlerts',
                label: 'Wishlist Alerts',
                description: 'Price drops and restock notifications',
              },
              {
                key: 'newsletter',
                label: 'Newsletter',
                description: 'Monthly newsletter with style tips',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-3 p-3 hover:bg-foreground/5 rounded-md transition-colors"
              >
                <Checkbox
                  id={item.key}
                  checked={
                    emailNotifications[
                      item.key as keyof typeof emailNotifications
                    ]
                  }
                  onCheckedChange={(checked) =>
                    setEmailNotifications((prev) => ({
                      ...prev,
                      [item.key]: checked,
                    }))
                  }
                  className="mt-1"
                />
                <Label htmlFor={item.key} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-body font-medium text-sm">
                      {item.label}
                    </p>
                    <p className="font-body text-xs text-foreground/60">
                      {item.description}
                    </p>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Column - Regional Preferences & Save */}
        <div className="space-y-6">
          {/* Currency Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 bg-white border border-foreground/10 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-foreground/5 rounded-md">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-body font-semibold">Currency</h2>
                <p className="font-body text-sm text-foreground/60">
                  Choose your preferred currency
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Display Currency
              </Label>
              <Select value={currency.code} onValueChange={handleCurrencyChange}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem value={currency.code} key={currency.code}>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{currency.name}</p>
                      <p className="text-xs text-muted-foreground">{currency.code}</p>  
                    </div>
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-end"
          >
            <Button
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              className="w-full h-12 bg-[#F8E231] text-black hover:bg-black hover:text-white transition-colors font-body text-sm font-medium disabled:opacity-50"
            >
              {isSavingPreferences ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"
                  />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}