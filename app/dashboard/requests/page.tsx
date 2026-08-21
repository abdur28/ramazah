'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getMyRequests, submitRequest, type ProductRequest } from '@/lib/account';

/**
 * "Tell us what you need and we'll do the rest" — the service the business
 * leads with, which until now lived entirely in WhatsApp threads where neither
 * side could see what state a request was in.
 *
 * The customer owns the item, details and budget. The quote and the status are
 * staff-owned and not grantable to customers, which is why they arrive here
 * read-only.
 */
const STATUS: Record<ProductRequest['status'], { label: string; className: string; note: string }> = {
  asked:     { label: 'With us',   className: 'bg-wash text-ink-muted',            note: 'We are looking for it.' },
  quoted:    { label: 'Quoted',    className: 'bg-sage-deep/10 text-sage-deep',    note: 'Reply to accept and we will buy it on the next run.' },
  buying:    { label: 'Buying',    className: 'bg-warning/10 text-warning',        note: 'Being bought in Egypt.' },
  fulfilled: { label: 'Fulfilled', className: 'bg-success/10 text-success',        note: 'On its way to you as an order.' },
  declined:  { label: 'Declined',  className: 'bg-destructive/10 text-destructive', note: 'We could not source this one.' },
};

export default function RequestsPage() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ item: '', details: '', referenceUrl: '', quantity: 1, budget: '' });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { requests: fetched } = await getMyRequests(user.id);
    setRequests(fetched);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!user?.id || isSaving) return;

    setIsSaving(true);
    const { error } = await submitRequest(user.id, form);
    setIsSaving(false);

    if (error) { toast.error(error); return; }

    toast.success('Sent. We will come back to you with a price.');
    setForm({ item: '', details: '', referenceUrl: '', quantity: 1, budget: '' });
    setIsOpen(false);
    load();
  };

  const field = 'w-full rounded-sm border border-rule bg-card px-4 py-3 font-body text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-sage-deep';
  const label = 'block font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2';

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">Your account</p>
        <h1 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          Ask for an item
        </h1>
        <p className="mt-3 max-w-[54ch] font-body text-sm text-ink-muted">
          Anything you cannot find here, we can look for in Egypt. Tell us what it is and
          roughly what you want to spend, and we will come back with a price before buying
          anything.
        </p>
      </motion.div>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="mb-8 inline-flex items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New request
        </button>
      )}

      {isOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-10 rounded-sm border border-rule bg-wash p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>What are you looking for?</label>
              <input className={field} value={form.item} placeholder="Hibiscus tea, loose, 1kg" onChange={(e) => setForm({ ...form, item: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Anything else we should know</label>
              <textarea rows={3} className={field} value={form.details} placeholder="Brand, size, colour, or what it is for" onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Link or photo <span className="normal-case tracking-normal">(optional)</span></label>
              <input className={field} value={form.referenceUrl} placeholder="https://" onChange={(e) => setForm({ ...form, referenceUrl: e.target.value })} />
            </div>
            <div>
              <label className={label}>Quantity</label>
              <input type="number" min={1} className={field} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>Budget <span className="normal-case tracking-normal">(optional, ₦)</span></label>
              <input type="number" min={0} className={field} value={form.budget} placeholder="20000" onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleSubmit} disabled={isSaving} className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground disabled:opacity-60">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Send request
            </button>
            <button onClick={() => setIsOpen(false)} className="rounded-sm border border-rule px-6 py-3 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-foreground">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16 text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-sm border border-dashed border-rule py-16 text-center">
          <p className="font-body text-sm text-foreground">No requests yet</p>
          <p className="mx-auto mt-1 max-w-[42ch] font-body text-sm text-ink-muted">
            Anything you ask for appears here, with its price and progress.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => {
            const status = STATUS[request.status];

            return (
              <li key={request.id} className="rounded-sm border border-rule bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-foreground">
                      {request.item}
                      {request.quantity > 1 && (
                        <span className="text-ink-muted"> × {request.quantity}</span>
                      )}
                    </p>
                    {request.details && (
                      <p className="mt-1 max-w-[60ch] font-body text-sm text-ink-muted">{request.details}</p>
                    )}
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-body text-[10px] uppercase tracking-[0.14em] ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                {request.quotedAmount !== null && (
                  <p className="mt-3 font-body text-sm text-foreground">
                    Quoted at{' '}
                    <span className="font-medium tabular-nums">{formatPrice(request.quotedAmount)}</span>
                  </p>
                )}

                {request.staffNote && (
                  <p className="mt-2 rounded-sm border border-rule bg-wash px-4 py-2.5 font-body text-sm text-ink-muted">
                    {request.staffNote}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-ink-muted">
                  <span>
                    {new Date(request.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  {request.budget !== null && <span>Budget {formatPrice(request.budget)}</span>}
                  <span>{status.note}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
