<script setup lang="ts">
const props = defineProps<{ id: number, size?: 'sm' | 'md' }>()
const { health } = useNetwork()
const { t, lang } = useLang()

const h = computed(() => health(props.id))
const title = computed(() => {
  const { state, rtt, up, total } = h.value
  const ms = rtt != null ? ` · ${fmtRtt(rtt, lang.value)}` : ''
  return {
    up: `${t('online', 'в сети')}${ms}`,
    partial: `${t(`${up} of ${total} addresses answer`, `отвечают ${up} из ${total} адресов`)}${ms}`,
    down: t('not answering', 'не отвечает'),
    unknown: t('checking…', 'проверяется…'),
    off: '',
  }[state]
})
</script>

<template>
  <span v-if="h.state !== 'off'" class="status-dot" :class="[h.state, size ?? 'md']" :title="title" />
</template>

<style scoped>
.status-dot { display: inline-block; border-radius: 9999px; flex: none; position: relative; }
.status-dot.md { width: 12px; height: 12px; box-shadow: 0 0 0 2.5px var(--ui-bg); }
.status-dot.sm { width: 8px; height: 8px; }
.status-dot.up { background: #22c55e; }
.status-dot.up::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; background: #22c55e;
  animation: ping-wave 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.status-dot.partial { background: #f59e0b; }
.status-dot.down { background: #ef4444; }
.status-dot.unknown { background: #a1a1aa; }
@keyframes ping-wave { 75%, 100% { transform: scale(2.4); opacity: 0; } }
</style>
