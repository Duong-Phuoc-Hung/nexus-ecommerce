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

/** Keep post-login redirects inside the signed-in user's workspace. */
export function roleHomePath(role: string | null | undefined) {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SELLER':
      return '/seller';
    case 'SUPPORT_STAFF':
    case 'SUPPORT':
      return '/support';
    default:
      return '/';
  }
}

export function canRoleVisitPath(role: string | null | undefined, path: string) {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  if (
    pathname === '/' ||
    pathname === '/products' ||
    pathname.startsWith('/products/') ||
    pathname === '/auctions' ||
    pathname.startsWith('/auctions/') ||
    pathname === '/cart'
  )
    return true;
  if (pathname === '/account') return role === 'BUYER' || role === 'ADMIN';
  if (
    pathname.startsWith('/account/') ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/')
  )
    return role === 'BUYER';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return role === 'ADMIN';
  if (pathname === '/seller' || pathname.startsWith('/seller/')) {
    return role === 'SELLER' || role === 'ADMIN';
  }
  if (pathname === '/support' || pathname.startsWith('/support/')) {
    return role === 'SUPPORT_STAFF' || role === 'SUPPORT' || role === 'ADMIN';
  }
  return false;
}
