/** Always enabled through the manifest's declared content script and host permission. */
export const GITLAB_COM_ORIGIN = 'https://gitlab.com';

/**
 * Self-managed GitLab origins the user has added (e.g. "https://gitlab.example.com").
 * gitlab.com is always enabled and is not stored here.
 */
export const instanceOrigins = storage.defineItem<string[]>('sync:instanceOrigins', {
  fallback: [],
});

/** Normalizes user input like "gitlab.example.com/" into an origin. */
export function toOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Match pattern covering a whole origin, for permissions and script registration. */
export function originToMatchPattern(origin: string): string {
  return `${origin}/*`;
}

export function hasAccess(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [originToMatchPattern(origin)] });
}

export async function isInstanceEnabled(origin: string): Promise<boolean> {
  if (origin === GITLAB_COM_ORIGIN) return true;
  if (!(await instanceOrigins.getValue()).includes(origin)) return false;
  return hasAccess(origin);
}

/**
 * Stores the origin and asks for its host permission. Must be called straight
 * from a click handler: Firefox only shows the permission prompt while the user
 * gesture is still active, so nothing may be awaited before the request.
 *
 * The origin is stored *before* the prompt resolves, because Firefox closes the
 * popup when the prompt opens and the rest of this function never runs. The
 * background picks the origin up from `permissions.onAdded` instead; a denied
 * origin stays listed as "no access" on the options page.
 */
export async function enableInstance(origin: string): Promise<boolean> {
  const stored = addOrigin(origin);
  const granted = await browser.permissions.request({ origins: [originToMatchPattern(origin)] });
  await stored;
  // Register immediately rather than relying on the permission/storage events
  // reaching a sleeping service worker.
  if (granted) await browser.runtime.sendMessage({ type: 'sync-registration' } satisfies BackgroundMessage);
  return granted;
}

export async function removeInstance(origin: string): Promise<void> {
  await removeOrigin(origin);
  // Best effort: Chrome refuses to revoke a permission that another granted
  // pattern still covers, which is not a failure worth reporting.
  await browser.permissions
    .remove({ origins: [originToMatchPattern(origin)] })
    .catch(() => undefined);
}

async function addOrigin(origin: string): Promise<void> {
  const current = await instanceOrigins.getValue();
  if (current.includes(origin) || origin === GITLAB_COM_ORIGIN) return;
  await instanceOrigins.setValue([...current, origin].sort());
}

async function removeOrigin(origin: string): Promise<void> {
  const current = await instanceOrigins.getValue();
  await instanceOrigins.setValue(current.filter((o) => o !== origin));
}
