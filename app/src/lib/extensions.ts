/**
 * Auth and billing are extension points only.
 * This draft does not integrate a provider and it never charges.
 */

export interface Session {
  userId: string;
}

/** Replace with a session lookup when an auth provider is chosen. Anonymous use is allowed until then. */
export function getSession(): Session | null {
  return null;
}

/** Replace with a billing check. Do not call a payment API from this stub. */
export function assertBillingAllowsEnqueue(): void {
  return;
}

export function assertCanEnqueue(): void {
  getSession();
  assertBillingAllowsEnqueue();
}
