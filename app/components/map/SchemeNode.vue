<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

// Compact card of the scheme view.
const props = defineProps<{ id: string, data: { deviceId: number }, selected?: boolean }>()
const { deviceById, health } = useNetwork()
const { lang, L } = useLang()
const device = computed(() => deviceById(props.data.deviceId))
const addr = computed(() => (device.value ? primaryAddress(device.value) : undefined))
const rtt = computed(() => health(props.data.deviceId).rtt)
const accent = computed(() => meshAccent(device.value) ?? '#71717a')
</script>

<template>
  <div v-if="device" class="scheme-node" :class="{ selected }">
    <div class="icon" :style="{ '--accent': accent }">
      <UIcon :name="deviceTypes[device.type]?.icon ?? 'i-lucide-circle-help'" class="size-4.5" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5">
        <span class="name truncate">{{ device.name }}</span>
        <MapStatusDot :id="device.id" size="sm" />
        <MapYggBadge :id="device.id" compact />
      </div>
      <div class="addr truncate">
        <template v-if="addr">{{ addr.value }}</template>
        <span v-else class="opacity-60">{{ L(deviceTypes[device.type]?.label) }}</span>
        <span v-if="rtt != null" class="rtt">{{ fmtRtt(rtt, lang) }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" class="!opacity-0" :connectable="false" />
    <Handle type="target" :position="Position.Left" class="!opacity-0" :connectable="false" />
  </div>
</template>

<style scoped>
.scheme-node {
  display: flex; align-items: center; gap: 10px; width: 210px; height: 56px; padding: 0 12px;
  border-radius: 12px; background: var(--ui-bg); border: 1px solid var(--ui-border);
  box-shadow: 0 1px 2px rgb(0 0 0 / .05); transition: border-color .15s, box-shadow .15s;
}
.scheme-node:hover { border-color: var(--ui-border-accented); }
.scheme-node.selected { border-color: var(--ui-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-primary) 25%, transparent); }
.icon {
  display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex: none;
  color: var(--accent); background: color-mix(in oklab, var(--accent) 14%, transparent);
}
.name { font-weight: 600; font-size: 13px; color: var(--ui-text-highlighted); }
.addr { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--ui-text-muted); }
.rtt { margin-left: 6px; color: #22c55e; }
</style>
