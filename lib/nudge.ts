/**
 * Ask the server to send the signed-in customer's own queued mail now.
 *
 * Called right after something that queues a message they are waiting for — a
 * sourcing request they just submitted, an account they just created. The
 * scheduled run would send it anyway; this is the difference between an
 * acknowledgement arriving while they are still on the page and one arriving
 * within the hour.
 *
 * Fire-and-forget on purpose. It must never block the screen or raise an error:
 * their request was saved, and mail is not their problem.
 */
export function nudgeMyMail(): void {
  void fetch('/api/email/nudge', { method: 'POST', keepalive: true }).catch(() => {});
}
