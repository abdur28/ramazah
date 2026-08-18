import { create } from "zustand";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AdminMailerDataStore, EmailRecipient, EmailCampaign, EmailStats } from '@/types/admin';
import { getProductsByIds } from "@/lib/products";

/**
 * Utility function to create error messages
 */
const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

/**
 * Admin hook for email/mailer management
 */
const useAdminMailer = create<AdminMailerDataStore>((set, get) => ({
  // State
  emailRecipients: [],
  emailCampaigns: [],
  emailStats: null,
  
  // Loading & Error states
  loading: {
    users: false,
    orders: false,
    products: false,
    categories: false,
    collections: false,
    analytics: false,
    adminAction: false
  },
  error: {
    users: null,
    orders: null,
    products: null,
    categories: null,
    collections: null,
    analytics: null,
    adminAction: null
  },
  
  // Reset method
  resetMailer: () => set({ 
    emailRecipients: [],
    emailCampaigns: [],
    emailStats: null
  }),
  
  /**
   * Fetch email recipients (users who opted in)
   */
  fetchEmailRecipients: async (emailType?: 'promotions' | 'newArrivals' | 'newsletter') => {
    set(state => ({ 
      loading: { ...state.loading, users: true },
      error: { ...state.error, users: null } 
    }));
    
    try {
      let usersQuery = query(collection(db, 'users'));
      
      // Filter by email notification preferences if specified
      if (emailType) {
        usersQuery = query(
          usersQuery,
          where(`preferences.emailNotifications.${emailType}`, '==', true)
        );
      } else {
        // Get users who opted in for ANY email type
        usersQuery = query(
          usersQuery,
          where('emailOptIn', '==', true)
        );
      }
      
      usersQuery = query(usersQuery, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(usersQuery);
      
      const recipients: EmailRecipient[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          firstName: data.displayName?.split(' ')[0],
          preferences: data.preferences,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });
      
      set(state => ({
        emailRecipients: recipients,
        loading: { ...state.loading, users: false }
      }));
    } catch (error) {
      console.error('Error fetching email recipients:', error);
      set(state => ({
        loading: { ...state.loading, users: false },
        error: { ...state.error, users: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Fetch email campaigns history (future enhancement)
   */
  fetchEmailCampaigns: async (options = {}) => {
    // This would fetch from a campaigns collection if you implement it
    // For now, we'll leave it as a placeholder
    console.log('Email campaigns feature - coming soon');
  },
  
  /**
   * Fetch email statistics
   */
  fetchEmailStats: async () => {
    set(state => ({ 
      loading: { ...state.loading, analytics: true },
      error: { ...state.error, analytics: null } 
    }));
    
    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      // Calculate stats
      const stats: EmailStats = {
        totalUsers: users.length,
        totalOptedIn: users.filter(u => u.emailOptIn).length,
        promotionsOptedIn: users.filter(u => u.preferences?.emailNotifications?.promotions).length,
        newArrivalsOptedIn: users.filter(u => u.preferences?.emailNotifications?.newArrivals).length,
        newsletterOptedIn: users.filter(u => u.preferences?.emailNotifications?.newsletter).length,
        totalCampaigns: 0, // Would come from campaigns collection
        campaignsThisMonth: 0,
        emailsSentTotal: 0,
        emailsSentThisMonth: 0
      };
      
      set(state => ({
        emailStats: stats,
        loading: { ...state.loading, analytics: false }
      }));
    } catch (error) {
      console.error('Error fetching email stats:', error);
      set(state => ({
        loading: { ...state.loading, analytics: false },
        error: { ...state.error, analytics: createErrorMessage(error) }
      }));
    }
  },
  
  /**
   * Send promotion email to selected recipients
   */
  sendPromotionEmail: async (data) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const recipients = get().emailRecipients.filter(r => 
        data.recipients.includes(r.id)
      );
      
      const emailPromises = recipients.map(async (recipient) => {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'promotions',
              data: {
                to: recipient.email,
                firstName: recipient.firstName || recipient.displayName || 'Customer',
                promoData: data.promoData
              }
            })
          });
          
          const result = await response.json();
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: result.success,
            error: result.error
          };
        } catch (error) {
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: false,
            error: createErrorMessage(error)
          };
        }
      });
      
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      return { successCount, failedCount, results };
    } catch (error) {
      console.error('Error sending promotion emails:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Send new arrivals email to selected recipients
   */
  sendNewArrivalsEmail: async (data) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      // Fetch product details for the selected products
      const { products } = await getProductsByIds(data.productIds);
      
      const recipients = get().emailRecipients.filter(r => 
        data.recipients.includes(r.id)
      );
      
      const emailPromises = recipients.map(async (recipient) => {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_arrivals',
              data: {
                to: recipient.email,
                firstName: recipient.firstName || recipient.displayName || 'Customer',
                products
              }
            })
          });
          
          const result = await response.json();
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: result.success,
            error: result.error
          };
        } catch (error) {
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: false,
            error: createErrorMessage(error)
          };
        }
      });
      
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      return { successCount, failedCount, results };
    } catch (error) {
      console.error('Error sending new arrivals emails:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  /**
   * Send custom newsletter email to selected recipients
   */
  sendNewsletterEmail: async (data) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const recipients = get().emailRecipients.filter(r => 
        data.recipients.includes(r.id)
      );
      
      const emailPromises = recipients.map(async (recipient) => {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'newsletter',
              data: {
                to: recipient.email,
                firstName: recipient.firstName || recipient.displayName || 'Customer',
                newsletterData: data.newsletterData
              }
            })
          });
          
          const result = await response.json();
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: result.success,
            error: result.error
          };
        } catch (error) {
          return {
            email: recipient.email,
            name: recipient.displayName || 'Customer',
            success: false,
            error: createErrorMessage(error)
          };
        }
      });
      
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      set(state => ({
        loading: { ...state.loading, adminAction: false }
      }));
      
      return { successCount, failedCount, results };
    } catch (error) {
      console.error('Error sending newsletter emails:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  }
}));

export default useAdminMailer;