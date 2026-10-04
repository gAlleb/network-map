<script setup lang="ts">
import { NodeResizer } from '@vue-flow/node-resizer'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ id: string, data: { zoneId: number, editable: boolean }, selected?: boolean }>()
const emit = defineEmits<{ resized: [zoneId: number, rect: { x: number, y: number, width: number, height: number }] }>()
const { zoneById, devices, health } = useNetwork()
const zone = computed(() => zoneById(props.data.zoneId))
const color = computed(() => zoneColor(zone.value?.color ?? 'zinc'))

const members = computed(() => devices.value.filter(d => d.zoneId === props.data.zoneId))
const pinged = computed(() => members.value.filter(d => health(d.id).state !== 'off'))
const up = computed(() => pinged.value.filter(d => ['up', 'partial'].includes(health(d.id).state)).length)
</script>

<template>
  <div v-if="zone" class="zone" :class="{ selected }" :style="{ '--zone': color }">
    <NodeResizer
      v-if="data.editable"
      :is-visible="selected"
      :min-width="200" :min-height="140"
      :color="color"
      @resize-end="(e: any) => emit('resized', zone!.id, e.params)"
    />
    <div class="header zone-header" :class="{ editable: data.editable }">
      <div class="badge">
        <UIcon :name="zoneKinds[zone.kind]?.icon ?? 'i-lucide-square-dashed'" class="size-4" />
      </div>
      <span class="title">{{ zone.name }}</span>
      <span v-if="zone.subnet" class="subnet">{{ zone.subnet }}</span>
      <span v-if="pinged.length" class="count" :title="'отвечают на пинг'">
        <span class="inline-block size-1.5 rounded-full" :class="up === pinged.length ? 'bg-green-500' : up ? 'bg-amber-500' : 'bg-red-500'" />
        {{ up }}/{{ pinged.length }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.zone {
  width: 100%; height: 100%; pointer-events: none; border-radius: 24px;
  background: color-mix(in oklab, var(--zone) 7%, transparent);
  border: 1.5px dashed color-mix(in oklab, var(--zone) 45%, transparent);
  transition: border-color .15s, background .15s;
}
.zone.selected { border-style: solid; border-color: var(--zone); background: color-mix(in oklab, var(--zone) 10%, transparent); }
.header { pointer-events: all; }
.header.editable { cursor: grab; }
.header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; }
.badge {
  flex: none;
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  background: var(--zone); color: white; box-shadow: 0 4px 12px -4px var(--zone);
}
.title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; font-size: 15px; color: var(--ui-text-highlighted); letter-spacing: -0.01em; }
.subnet {
  flex: none; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; padding: 2px 8px; border-radius: 999px;
  color: var(--zone); background: color-mix(in oklab, var(--zone) 14%, transparent);
}
.count { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ui-text-muted); font-variant-numeric: tabular-nums; }
</style>
