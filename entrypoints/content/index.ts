import './style.css';

const ATTR = 'data-gl-presenter-mode';

export default defineContentScript({
  // gitlab.com is declared here; self-managed instances are registered at
  // runtime by the background script once the user grants access to them.
  matches: ['*://gitlab.com/*'],
  // Run before GitLab renders anything, so confidential content never flashes.
  runAt: 'document_start',
  async main() {
    const root = document.documentElement;
    // Injected into open tabs when an instance is granted; never run twice in one page.
    if (document.getElementById('gl-presenter-indicator')) return;

    // Appended to <html> because <body> may not exist yet at document_start.
    const indicator = document.createElement('button');
    indicator.id = 'gl-presenter-indicator';
    indicator.type = 'button';
    indicator.title = 'Presenter mode is on – click or press Alt+Shift+H to turn off';
    indicator.textContent = 'Presenter mode';
    indicator.addEventListener('click', () => presenterMode.setValue(false));
    root.append(indicator);

    const apply = (enabled: boolean) => root.toggleAttribute(ATTR, enabled);
    apply(await presenterMode.getValue());
    presenterMode.watch(apply);
  },
});
