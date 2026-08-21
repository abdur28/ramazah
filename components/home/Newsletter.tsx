"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The closing section.
 *
 * The old one offered "10% off your first order, plus exclusive drops and
 * street style updates" — a discount with no code system behind it, through a
 * form that only ever called `console.log`. Two promises, neither kept.
 *
 * This asks for the thing that already works instead: signing up seeds
 * `preferences.emailNotifications`, so new-arrival and restock mail is real
 * from the moment the account exists. Capturing anonymous emails properly needs
 * a subscribers table, which does not exist yet.
 */
export default function Newsletter() {
  const { user } = useAuth();

  return (
    <section className="relative z-10 border-t border-rule bg-background">
      <div className="mx-auto px-6 py-16 md:px-10 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="grid gap-8 md:grid-cols-2 md:items-end md:gap-16"
        >
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Restocks and arrivals
            </p>
            <h2 className="mt-4 max-w-[16ch] font-heading text-4xl font-light leading-[1.05] text-foreground md:text-5xl">
              Know when the next crate lands
            </h2>
          </div>

          <div>
            <p className="max-w-[46ch] font-body text-base text-ink-muted">
              Stock arrives in batches, and the coffee and dates go first. Account holders
              get an email when a crate is unpacked and when a saved item is back — nothing
              else, and you can turn it off in one click.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <Link
                  href="/dashboard/preferences"
                  className="rounded-md bg-sage-deep px-7 py-3.5 font-body text-sm font-medium text-background transition-colors hover:bg-sage-deep/90"
                >
                  Manage your notifications
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-sage-deep px-7 py-3.5 font-body text-sm font-medium text-background transition-colors hover:bg-sage-deep/90"
                  >
                    Create an account
                  </Link>
                  <Link
                    href="/auth/login"
                    className="rounded-md border border-rule px-7 py-3.5 font-body text-sm text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
