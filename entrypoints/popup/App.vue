<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

type InstanceStatus = 'checking' | 'not-a-page' | 'enabled' | 'available' | 'granting';

const enabled = ref(false);
const origin = ref<string | null>(null);
const instance = ref<InstanceStatus>('checking');
const error = ref<string | null>(null);
let unwatch: (() => void) | undefined;

/** Presenter mode does nothing on a tab the content script cannot run on. */
const supported = computed(() => instance.value === 'enabled');

onMounted(async () => {
  enabled.value = await presenterMode.getValue();
  unwatch = presenterMode.watch((value) => (enabled.value = value));

  // `activeTab` gives us the URL of the tab the popup was opened from, without
  // needing the broad "tabs" permission.
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/i.test(tab.url)) {
    instance.value = 'not-a-page';
    return;
  }
  origin.value = new URL(tab.url).origin;
  instance.value = (await isInstanceEnabled(origin.value)) ? 'enabled' : 'available';
});
onUnmounted(() => unwatch?.());

function toggle() {
  presenterMode.setValue(!enabled.value);
}

async function enableHere() {
  if (!origin.value) return;
  error.value = null;
  instance.value = 'granting';
  try {
    // The background injects into this tab once access is granted, so the toggle
    // works right away without a reload.
    if (await enableInstance(origin.value)) {
      instance.value = 'enabled';
    } else {
      instance.value = 'available';
      error.value = 'Permission was not granted.';
    }
  } catch (cause) {
    instance.value = 'available';
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function openOptions() {
  void browser.runtime.openOptionsPage();
  window.close();
}
</script>

<template>
  <div class="popup">
    <h1>Presenter mode</h1>
    <button
      :class="{ on: enabled && supported }"
      :disabled="!supported"
      :title="supported ? undefined : 'Not available on this page'"
      @click="toggle"
    >
      {{ enabled ? 'On' : 'Off' }}
    </button>
    <p class="muted hint">Shortcut: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd></p>

    <hr />

    <p v-if="instance === 'checking'" class="muted">Checking this tab…</p>
    <p v-else-if="instance === 'not-a-page'" class="muted">
      Open a GitLab page to enable the extension there.
    </p>
    <template v-else>
      <p class="mono muted">{{ origin }}</p>
      <p v-if="instance === 'enabled'">Active on this instance.</p>
      <template v-else>
        <p class="muted">Not enabled on this instance.</p>
        <button :disabled="instance === 'granting'" @click="enableHere">
          {{ instance === 'granting' ? 'Requesting…' : 'Enable on this instance' }}
        </button>
      </template>
      <p v-if="error" class="danger">{{ error }}</p>
    </template>

    <hr />

    <button class="link" @click="openOptions">Manage instances</button>
  </div>
</template>

<style scoped>
.popup {
  width: 260px;
  text-align: center;
}
h1 {
  font-size: 1.2em;
  margin: 0 0 0.8em;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.on {
  background-color: #dd2b0e;
  color: #fff;
}
button.link {
  background: none;
  padding: 0.2em;
  text-decoration: underline;
}
.hint {
  font-size: 0.85em;
}
hr {
  margin: 1em 0;
  border: 0;
  border-top: 1px solid rgb(128 128 128 / 0.3);
}
</style>
