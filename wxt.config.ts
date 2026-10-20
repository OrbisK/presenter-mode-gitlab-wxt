import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  // MV3 for both Chrome and Firefox so the `action` badge and manifest shape are identical.
  manifestVersion: 3,
  manifest: {
    // GitLab's trademark guidelines require that a third-party extension not
    // lead with the GitLab name and use only the "… for GitLab" or "GitLab
    // Compatible" form.
    name: 'Presenter Mode for GitLab',
    description: 'Hides internal notes and threads on GitLab while you screenshare.',
    // `activeTab` lets the popup read the current tab's URL for "Enable on this
    // instance"; `scripting` registers the content script for those instances.
    permissions: ['storage', 'scripting', 'activeTab'],
    // gitlab.com is granted up front; self-managed instances are added by the
    // user and granted through the optional permission.
    host_permissions: ['*://gitlab.com/*'],
    optional_host_permissions: ['*://*/*'],
    action: {
      default_title: 'Presenter Mode for GitLab',
    },
    commands: {
      'toggle-presenter-mode': {
        suggested_key: { default: 'Alt+Shift+H' },
        description: 'Toggle presenter mode',
      },
    },
    // Firefox requires a stable extension id for MV3.
    browser_specific_settings: {
      gecko: {
        id: 'presenter-mode-for-gitlab@local',
        strict_min_version: '128.0',
      },
    },
  },
});
