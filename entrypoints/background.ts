/**
 * Bundle paths WXT emits for `entrypoints/content/`. The runtime registration
 * below has to name them literally.
 */
const CONTENT_SCRIPT_JS = 'content-scripts/content.js';
const CONTENT_SCRIPT_CSS = 'content-scripts/content.css';
const REGISTRATION_ID = 'presenter-mode-instances';

let lastError: string | undefined;

export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command === TOGGLE_COMMAND) {
      await presenterMode.setValue(!(await presenterMode.getValue()));
    }
  });

  const updateBadge = (enabled: boolean) => {
    browser.action.setBadgeText({ text: enabled ? 'ON' : '' });
    browser.action.setBadgeBackgroundColor({ color: '#dd2b0e' });
  };
  presenterMode.getValue().then(updateBadge);
  presenterMode.watch(updateBadge);

  // gitlab.com is covered by the declared content script. Every other origin is
  // opt-in, so its content script is registered here once permission is granted.
  void syncRegistration();
  browser.runtime.onInstalled.addListener(() => void syncRegistration());
  browser.runtime.onStartup.addListener(() => void syncRegistration());
  browser.permissions.onAdded.addListener(() => void syncRegistration());
  browser.permissions.onRemoved.addListener(() => void syncRegistration());
  instanceOrigins.watch(() => void syncRegistration());

  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    if (message?.type !== 'sync-registration') return false;
    syncRegistration().then(
      () => sendResponse({ error: lastError } satisfies RegistrationStatus),
      (cause) => sendResponse({ error: String(cause) } satisfies RegistrationStatus),
    );
    return true; // keep the message channel open for the async response
  });
});

/**
 * Runs are serialized: several triggers above fire together (startup alongside
 * `onInstalled`, `permissions.onAdded` alongside the storage watcher), and two
 * overlapping runs would both unregister before either registers, so the second
 * registration fails with a duplicate id.
 */
let queue: Promise<unknown> = Promise.resolve();

function syncRegistration(): Promise<void> {
  const run = queue.then(performSync);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Registers (or clears) one dynamic content script covering every configured
 * origin we hold permission for. Origins whose permission is missing are
 * skipped, since registering them would throw.
 */
async function performSync(): Promise<void> {
  const patterns: string[] = [];
  for (const origin of await instanceOrigins.getValue()) {
    if (origin !== GITLAB_COM_ORIGIN && (await hasAccess(origin))) {
      patterns.push(originToMatchPattern(origin));
    }
  }

  // Throws when the id is unknown, which is the normal case on a fresh profile.
  await browser.scripting.unregisterContentScripts({ ids: [REGISTRATION_ID] }).catch(() => undefined);

  lastError = undefined;
  if (patterns.length === 0) return;

  try {
    await browser.scripting.registerContentScripts([
      {
        id: REGISTRATION_ID,
        matches: patterns,
        js: [CONTENT_SCRIPT_JS],
        css: [CONTENT_SCRIPT_CSS],
        // Same as the declared script: hide before GitLab renders anything.
        runAt: 'document_start',
        persistAcrossSessions: true,
      },
    ]);
  } catch (cause) {
    lastError = cause instanceof Error ? cause.message : String(cause);
    console.error('could not register content script for', patterns, cause);
  }
}
