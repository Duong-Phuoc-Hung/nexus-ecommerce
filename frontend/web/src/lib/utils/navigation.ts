export function safeNextPath(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
    return fallback;
  try {
    const u = new URL(value, 'https://nexus.invalid');
    return u.origin === 'https://nexus.invalid' ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Resolves the destination path after login/registration based on the authenticated user's role
 * and the requested `next` path.
 *
 * Ensures users are only redirected to zones they are authorized to access, preventing
 * situations where non-admin users (e.g. SUPPORT_STAFF, SELLER, BUYER) get redirected to
 * `/admin` and blocked because of a leftover `?next=%2Fadmin` parameter from a previous session/logout.
 */
export function resolveAuthDestination(
  role: string | null | undefined,
  nextPath: string | null | undefined,
): string {
  const safeNext = safeNextPath(nextPath);
  const normalizedRole = (role || '').trim().toUpperCase();

  const isMatchingPrefix = (path: string, prefix: string) =>
    path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?');

  // Default home per role
  const defaultHome = (() => {
    switch (normalizedRole) {
      case 'ADMIN':
        return '/admin';
      case 'SELLER':
        return '/seller';
      case 'SUPPORT_STAFF':
      case 'SUPPORT':
        return '/support';
      case 'BUYER':
      default:
        return '/';
    }
  })();

  // If next is root or an auth page, redirect to the default dashboard for this role
  if (
    safeNext === '/' ||
    isMatchingPrefix(safeNext, '/login') ||
    isMatchingPrefix(safeNext, '/register') ||
    isMatchingPrefix(safeNext, '/forgot-password') ||
    isMatchingPrefix(safeNext, '/reset-password')
  ) {
    return defaultHome;
  }

  // 1. /admin requires ADMIN role
  if (isMatchingPrefix(safeNext, '/admin')) {
    return normalizedRole === 'ADMIN' ? safeNext : defaultHome;
  }

  // 2. /seller requires SELLER or ADMIN role
  if (isMatchingPrefix(safeNext, '/seller')) {
    return normalizedRole === 'SELLER' || normalizedRole === 'ADMIN' ? safeNext : defaultHome;
  }

  // 3. /support requires SUPPORT_STAFF (or SUPPORT) or ADMIN role
  if (isMatchingPrefix(safeNext, '/support')) {
    return normalizedRole === 'SUPPORT_STAFF' ||
      normalizedRole === 'SUPPORT' ||
      normalizedRole === 'ADMIN'
      ? safeNext
      : defaultHome;
  }

  // Public/buyer routes (/products/..., /auctions/..., /account, /orders) are safe for any authenticated user
  return safeNext;
}
