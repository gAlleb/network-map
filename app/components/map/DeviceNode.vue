<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

// The illustrated node of the "Карта" view.
const props = defineProps<{ id: string, data: { deviceId: number }, selected?: boolean }>()
const { deviceById, health } = useNetwork()
const device = computed(() => deviceById(props.data.deviceId))
const addr = computed(() => (device.value ? primaryAddress(device.value) : undefined))
const down = computed(() => health(props.data.deviceId).state === 'down')
const accent = computed(() => meshAccent(device.value))
</script>

<template>
  <div v-if="device" class="device-node group" :class="{ selected, down }">
    <div class="art">
      <DeviceArt :type="device.type" :accent="accent" :size="device.type === 'mesh' || device.type === 'internet' ? 84 : 72" />
      <MapStatusDot :id="device.id" class="dot" />
    </div>
    <div class="name">{{ device.name }}</div>
    <div v-if="addr" class="addr">{{ addr.value }}</div>
    <MapYggBadge :id="device.id" class="mt-0.5" />

    <Handle v-for="p in [Position.Top, Position.Right, Position.Bottom, Position.Left]" :id="p" :key="p" type="source" :position="p" class="handle" />
  </div>
</template>

<style scoped>
.device-node {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 128px; padding: 8px 6px 10px; border-radius: 18px;
  border: 1.5px solid transparent; transition: background .15s, border-color .15s, box-shadow .15s;
}
.device-node:hover { background: color-mix(in oklab, var(--ui-bg-elevated) 70%, transparent); }
.device-node.selected {
  background: color-mix(in oklab, var(--ui-bg-elevated) 85%, transparent);
  border-color: var(--ui-primary);
  box-shadow: 0 8px 30px -10px color-mix(in oklab, var(--ui-primary) 60%, transparent);
}
.device-node.down .art :deep(svg) { filter: grayscale(0.85); opacity: 0.55; }
.art { position: relative; }
.dot { position: absolute; top: 2px; right: -2px; }
.name { font-weight: 600; font-size: 13px; line-height: 1.2; text-align: center; color: var(--ui-text-highlighted); margin-top: 2px; }
.addr { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: var(--ui-text-muted); }
.handle {
  width: 10px; height: 10px; background: var(--ui-primary); border: 2px solid var(--ui-bg);
  opacity: 0; transition: opacity .15s;
}
.device-node:hover .handle, .vue-flow__node.connecting .handle { opacity: 1; }
</style>
