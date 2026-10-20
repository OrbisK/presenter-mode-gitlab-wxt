<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

interface Instance {
  origin: string;
  /** False when the origin is stored but its host permission was denied or revoked. */
  access: boolean;
}

const instances = ref<Instance[]>([]);
const input = ref('');
const error = ref<string | null>(null);
const busy = ref(false);
let unwatch: (() => void) | undefined;

async function refresh() {
  const origins = await instanceOrigins.getValue();
  instances.value = await Promise.all(
    origins.map(async (origin) => ({ origin, access: await hasAccess(origin) })),
  );
}

onMounted(() => {
  void refresh();
  unwatch = instanceOrigins.watch(() => void refresh());
  browser.permissions.onAdded.addListener(refresh);
  browser.permissions.onRemoved.addListener(refresh);
});
onUnmounted(() => {
  unwatch?.();
  browser.permissions.onAdded.removeListener(refresh);
  browser.permissions.onRemoved.removeListener(refresh);
});

async function enable(origin: string) {
  busy.value = true;
  try {
    if (await enableInstance(origin)) {
      input.value = '';
    } else {
      error.value = `Permission for ${origin} was not granted, so presenter mode cannot run there.`;
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    busy.value = false;
    await refresh();
  }
}

function add() {
  error.value = null;
  const origin = toOrigin(input.value);

  if (!origin) {
    error.value = 'Enter a URL such as https://gitlab.example.com';
    return;
  }
  if (origin === GITLAB_COM_ORIGIN) {
    error.value = 'gitlab.com is always enabled.';
    return;
  }
  if (instances.value.some((instance) => instance.origin === origin && instance.access)) {
    error.value = `${origin} is already added.`;
    return;
  }
  // Not awaited before: the permission prompt needs the click's user gesture.
  void enable(origin);
}

async function remove(origin: string) {
  error.value = null;
  await removeInstance(origin);
}
</script>

<template>
  <main class="page">
    <h1>Presenter Mode for GitLab</h1>
    <p class="muted">
      Hides internal notes and threads while you screenshare. Toggle it with
      <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> or from the toolbar popup.
    </p>

    <section>
      <h2>GitLab instances</h2>
      <p class="muted">The extension runs only on the instances listed here.</p>

      <ul class="list">
        <li class="list-item">
          <span class="mono">{{ GITLAB_COM_ORIGIN }}</span>
          <span class="muted">always enabled</span>
        </li>
        <li v-for="instance in instances" :key="instance.origin" class="list-item">
          <span class="mono">{{ instance.origin }}</span>
          <span class="actions">
            <template v-if="!instance.access">
              <span class="danger">no access</span>
              <button type="button" :disabled="busy" @click="enable(instance.origin)">Grant</button>
            </template>
            <button type="button" @click="remove(instance.origin)">Remove</button>
          </span>
        </li>
      </ul>

      <form class="add-row" @submit.prevent="add">
        <input
          v-model="input"
          type="text"
          placeholder="https://gitlab.example.com"
          spellcheck="false"
          autocomplete="off"
        />
        <button type="submit" :disabled="busy">{{ busy ? 'Requesting…' : 'Add' }}</button>
      </form>

      <p v-if="error" class="danger">{{ error }}</p>
      <p class="muted hint">Open tabs on a newly added instance need a reload.</p>
    </section>

    <footer class="footer muted">
      This extension is not affiliated, endorsed, sponsored, or approved with or by GitLab Inc.
      GitLab is a trademark of GitLab Inc.
    </footer>
  </main>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem 0 3rem;
}
section {
  margin-top: 2rem;
}
.list {
  margin: 1rem 0;
  padding: 0;
  list-style: none;
  border: 1px solid rgb(128 128 128 / 0.3);
  border-radius: 8px;
}
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
}
.list-item + .list-item {
  border-top: 1px solid rgb(128 128 128 / 0.3);
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.add-row {
  display: flex;
  gap: 0.5rem;
}
.add-row input {
  flex: 1;
  min-width: 0;
}
.hint {
  font-size: 0.85em;
}
.footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(128 128 128 / 0.3);
  font-size: 0.8em;
}
</style>
