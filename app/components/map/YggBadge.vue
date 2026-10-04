<script setup lang="ts">
// Whether a device answers over Yggdrasil. Hidden unless one of its
// Yggdrasil addresses is pinged.
const props = defineProps<{ id: number, compact?: boolean }>()
const { deviceById, addressStatus } = useNetwork()

const best = computed(() => {
  const d = deviceById(props.id)
  const all = (d?.addresses ?? [])
    .filter(a => a.kind === 'yggdrasil')
    .map(a => addressStatus(props.id, a))
    .filter(Boolean) as DeviceStatus[]
  return all.find(s => s.state === 'up') ?? all[0]
})
const title = computed(() => {
  const b = best.value
  if (!b) return ''
  return b.state === 'up' ? `Yggdrasil отвечает${b.rtt != null ? ` · ${fmtRtt(b.rtt)}` : ''}` : 'Yggdrasil не отвечает'
})
</script>

<template>
  <span v-if="best" class="ygg" :class="[best.state, { compact }]" :title="title">
    <span class="dot" />
    <template v-if="!compact">YGG</template>
  </span>
</template>

<style scoped>
.ygg {
  display: inline-flex; align-items: center; gap: 4px; padding: 0 6px; border-radius: 999px; flex: none;
  font-size: 9.5px; font-weight: 700; letter-spacing: .04em; line-height: 16px;
  color: #a855f7; background: color-mix(in oklab, #a855f7 14%, transparent);
}
.ygg.compact { padding: 0; background: none; }
.dot { width: 6px; height: 6px; border-radius: 999px; background: #a855f7; }
.ygg.down { color: #a1a1aa; background: color-mix(in oklab, #a1a1aa 14%, transparent); }
.ygg.down .dot { background: #ef4444; }
.ygg.compact.down { background: none; }
</style>
