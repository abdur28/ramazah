'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAddresses, saveAddress, deleteAddress, type Address } from '@/lib/account';

/**
 * The address book.
 *
 * `addresses` has always supported several per customer with one marked
 * default; Settings only ever edited a single row, so anyone shipping to both
 * home and a shop had to retype one of them at every checkout.
 */
const EMPTY: Omit<Address, 'id'> = {
  fullName: '', phone: '', street: '', city: '', state: '',
  postalCode: '', country: 'Nigeria', isDefault: false,
};

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<(Omit<Address, 'id'> & { id?: string }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { addresses: fetched } = await getAddresses(user.id);
    setAddresses(fetched);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!user?.id || !editing || isSaving) return;

    if (!editing.fullName.trim() || !editing.street.trim() || !editing.city.trim()) {
      toast.error('Name, street and city are needed.');
      return;
    }

    setIsSaving(true);
    const { error } = await saveAddress(user.id, editing);
    setIsSaving(false);

    if (error) { toast.error('Could not save that address.'); return; }

    toast.success('Address saved.');
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAddress(id);
    if (error) { toast.error('Could not remove that address.'); return; }
    toast.success('Address removed.');
    load();
  };

  const field = 'w-full rounded-sm border border-rule bg-card px-4 py-3 font-body text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-sage-deep';
  const label = 'block font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2';

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">Your account</p>
        <h1 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          Addresses
        </h1>
        <p className="mt-3 max-w-[52ch] font-body text-sm text-ink-muted">
          Save the places you order to. The default one is filled in for you at checkout.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-rule bg-card p-5">
              <div className="flex gap-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                <div>
                  <p className="font-body text-sm text-foreground">
                    {address.fullName}
                    {address.isDefault && (
                      <span className="ml-3 rounded-full bg-wash px-2 py-0.5 font-body text-[10px] uppercase tracking-[0.14em] text-sage-deep">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-body text-sm text-ink-muted">
                    {address.street}, {address.city}
                    {address.state ? `, ${address.state}` : ''} · {address.country}
                  </p>
                  <p className="font-body text-sm text-ink-muted">{address.phone}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(address)}
                  className="rounded-sm border border-rule px-4 py-2 font-body text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  aria-label={`Remove ${address.fullName}'s address`}
                  className="rounded-sm border border-rule p-2 text-ink-faint transition-colors hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {!editing && (
            <button
              onClick={() => setEditing({ ...EMPTY, isDefault: addresses.length === 0 })}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-6 font-body text-sm text-ink-muted transition-colors hover:border-sage-deep hover:text-sage-deep"
            >
              <Plus className="h-4 w-4" />
              Add an address
            </button>
          )}

          {editing && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-sm border border-rule bg-wash p-6">
              <h2 className="mb-5 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {editing.id ? 'Edit address' : 'New address'}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={label}>Full name</label><input className={field} value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /></div>
                <div><label className={label}>Phone</label><input className={field} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={label}>Street</label><input className={field} value={editing.street} onChange={(e) => setEditing({ ...editing, street: e.target.value })} /></div>
                <div><label className={label}>City</label><input className={field} value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
                <div><label className={label}>State</label><input className={field} value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></div>
                <div><label className={label}>Postal code</label><input className={field} value={editing.postalCode ?? ''} onChange={(e) => setEditing({ ...editing, postalCode: e.target.value })} /></div>
                <div><label className={label}>Country</label><input className={field} value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></div>
              </div>

              <label className="mt-5 flex items-center gap-2 font-body text-sm text-ink-muted">
                <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} className="accent-[var(--sage-deep)]" />
                Use this address by default
              </label>

              <div className="mt-6 flex gap-3">
                <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save address
                </button>
                <button onClick={() => setEditing(null)} className="rounded-sm border border-rule px-6 py-3 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-foreground">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
