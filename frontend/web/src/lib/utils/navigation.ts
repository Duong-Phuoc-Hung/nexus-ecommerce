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
