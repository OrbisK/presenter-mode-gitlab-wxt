/** Global on/off state, shared by background, content scripts and popup. */
export const presenterMode = storage.defineItem<boolean>('local:presenterMode', {
  fallback: false,
});

export const TOGGLE_COMMAND = 'toggle-presenter-mode';
