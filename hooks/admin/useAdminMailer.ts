import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';

const supabase = () => createClient();
import { AdminMailerDataStore, EmailRecipient, EmailCampaign, EmailStats } from '@/types/admin';
import { getProductsByIds } from "@/lib/products";
import { describeError } from '@/lib/admin/errors';

/**
 * Utility function to create error messages
 */
/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

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
      let q = supabase()
        .from('profiles')
        .select('id, email, display_name, preferences, email_opt_in, created_at');

      if (emailType) {
        // Match inside the preferences jsonb column.
        q = q.eq(`preferences->emailNotifications->>${emailType}`, 'true');
      } else {
        q = q.eq('email_opt_in', true);
      }

      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const recipients: EmailRecipient[] = (data ?? []).map((row: any) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        firstName: row.display_name?.split(' ')[0],
        preferences: row.preferences,
        createdAt: row.created_at,
        source: 'account' as const,
      }));

      // Footer signups.
      //
      // `newsletter_subscribers` is where the storefront footer has been
      // putting every address people typed in — visitors with no account, which
      // is most of them. Nothing read that table. The form said "subscribed",
      // the row was written, and the list was unreachable from the one screen
      // that sends mail, so those people could never receive anything.
      //
      // They belong to the newsletter only: they never saw a preferences screen
      // and never opted into promotions or new arrivals.
      if (emailType === 'newsletter' || !emailType) {
        const { data: subscribers, error: subscriberError } = await supabase()
          .from('newsletter_subscribers')
          .select('id, email, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (subscriberError) throw new Error(subscriberError.message);

        const known = new Set(recipients.map(r => r.email.toLowerCase()));

        (subscribers ?? []).forEach((row: any) => {
          // Someone who signed up in the footer and later created an account
          // would otherwise be mailed twice.
          if (known.has(String(row.email).toLowerCase())) return;

          recipients.push({
            id: row.id,
            email: row.email,
            displayName: undefined,
            firstName: undefined,
            createdAt: row.created_at,
            source: 'footer' as const,
          });
        });
      }
      
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
      const [{ data, error }, { count: footerCount }] = await Promise.all([
        supabase().from('profiles').select('email_opt_in, preferences'),
        supabase()
          .from('newsletter_subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);
      if (error) throw new Error(error.message);

      const users = data ?? [];
      const optedInto = (type: string) =>
        users.filter((u: any) => u.preferences?.emailNotifications?.[type]).length;

      const stats: EmailStats = {
        totalUsers: users.length,
        totalOptedIn: users.filter((u: any) => u.email_opt_in).length,
        promotionsOptedIn: optedInto('promotions'),
        newArrivalsOptedIn: optedInto('newArrivals'),
        // Account holders who opted in, plus everyone who used the footer form.
        newsletterOptedIn: optedInto('newsletter') + (footerCount ?? 0),
        footerSubscribers: footerCount ?? 0,
        // No campaigns table yet — the feature is still a stub.
        totalCampaigns: 0,
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