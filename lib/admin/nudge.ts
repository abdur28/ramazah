/**
 * Ask the server to send what is due, without waiting for it.
 *
 * Called from the admin after anything that queues a customer-facing email —
 * recording a payment, marking an order shipped, sending a quote. Those are the
 * moments a customer is most likely to be watching for the message, so waiting
 * up to the scheduled interval is the wrong shape.
 *
 * Deliberately fire-and-forget. The row is already written and durable before
 * this runs, so a failed nudge costs a few minutes and nothing else — the
 * scheduled run picks it up. It must never block the screen or raise a toast:
 * the admin's action succeeded, and mail is not their problem.
 *
 * Guarded by the same route as the cron. An admin is already signed in, so no
 * secret is needed from here.
 */
export function nudgeMailer(): void {
  void fetch('/api/email/worker', { method: 'POST', keepalive: true }).catch(() => {});
}
