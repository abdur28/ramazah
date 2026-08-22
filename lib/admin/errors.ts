/**
 * Turning a thrown thing into something a shopkeeper can act on.
 *
 * The admin surfaced whatever `error.message` happened to contain. When the
 * connection dropped mid-save that meant a toast reading **"TypeError: Failed
 * to fetch"** — which names a JavaScript type, blames the code, and gives no
 * hint that the fix is to check the wifi. A dropped connection is the single
 * most likely failure in a shop run from Kaduna over domestic broadband, and it
 * was the worst-explained one.
 *
 * Two jobs here: recognise the failures that have a human explanation, and
 * refuse to show the ones that do not mean anything outside a stack trace.
 */

/**
 * Every browser words a failed connection differently, and none of them say
 * "connection". Chrome throws `Failed to fetch`, Firefox `NetworkError when
 * attempting to fetch resource`, Safari `Load failed`.
 */
export function isNetworkError(error: unknown): boolean {
  const message = rawMessage(error).toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('fetch failed') ||
    message.includes('network request failed') ||
    message.includes('err_internet_disconnected') ||
    message.includes('err_network') ||
    // supabase-js surfaces an aborted request this way when a page unloads
    // mid-flight, which reads to the user exactly like a dropped connection.
    (error as { name?: string })?.name === 'AbortError' ||
    (error as { name?: string })?.name === 'TypeError' && message.includes('fetch')
  );
}

export const NETWORK_MESSAGE =
  'Could not reach the server. Check your connection and try again — nothing you have typed is lost.';

/**
 * Postgres and PostgREST codes that mean something specific enough to say
 * plainly. Anything else falls through to the caller's own wording, because a
 * raw database message in a toast is noise.
 */
const BY_CODE: Record<string, string> = {
  '23505': 'Something with that name or code already exists. Try a different one.',
  '23503': 'Something else still refers to this, so it cannot be removed yet.',
  '23514': 'One of the values is outside what is allowed.',
  '23502': 'A required field was left empty.',
  '42501': 'Your account is not allowed to do that. Sign out and back in if you were just made an admin.',
  '22P02': 'One of the values is the wrong kind — a number where text was expected, or the reverse.',
  PGRST301: 'Your session has expired. Sign in again.',
};

/**
 * The message to show. `fallback` is what the caller would have said anyway, so
 * a genuinely unknown failure still reads like this app rather than like a
 * stack trace.
 */
export function describeError(error: unknown, fallback: string): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE;

  const code = (error as { code?: string })?.code;
  if (code && BY_CODE[code]) return BY_CODE[code];

  const message = rawMessage(error).trim();
  if (!message) return fallback;

  // A programming bug reaching the screen tells the reader nothing they can act
  // on. Note this has to test the *name*, not the message: `new TypeError('x')`
  // has `message === 'x'` — the type name only ever appears in the stack, so
  // matching the message against /^TypeError/ never fires.
  //
  // Genuine connection failures are also TypeErrors, but `isNetworkError` has
  // already claimed those above, so anything still a TypeError here is ours.
  const name = (error as { name?: string })?.name ?? '';
  const isProgrammingFault =
    name === 'TypeError' ||
    name === 'ReferenceError' ||
    name === 'SyntaxError' ||
    name === 'RangeError';

  // A stack, or something far too long to sit in a toast.
  const isUnreadable = message.includes('\n') || message.length > 180;

  return isProgrammingFault || isUnreadable ? fallback : message;
}

function rawMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return String(error);
}
