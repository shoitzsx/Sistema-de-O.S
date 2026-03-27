const AUTH_EMAIL_DOMAIN = 'aguia.local';

export function normalizeUsername(username: string): string {
  return String(username || '').trim().toLowerCase();
}

export function buildAuthEmail(username: string): string {
  const normalized = normalizeUsername(username).replace(/[^a-z0-9._-]/g, '-');
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
}