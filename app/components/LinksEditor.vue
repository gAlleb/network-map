<script setup lang="ts">
// Links of one device, editable in place. Unlike the rest of the device form
// every change here is saved immediately: links are their own rows, and a
// half-edited link list waiting for "Сохранить" would be easy to lose.
const props = defineProps<{ deviceId: number }>()
const net = useNetwork()
const { links, devices, deviceById } = net

const rows = computed(() => links.value
  .filter(l => l.source === props.deviceId || l.target === props.deviceId)
  .map(l => ({ link: l, other: deviceById(l.source === props.deviceId ? l.target : l.source) }))
  .filter(r => r.other))

const linkItems = toItems(linkKinds)
const otherDevices = computed(() => devices.value
  .filter(d => d.id !== props.deviceId)
  .map(d => ({ value: d.id, label: d.name, icon: deviceTypes[d.type]?.icon })))

// Labels are saved when the field is left, not on every keystroke.
const labels = reactive<Record<number, string>>({})
watchEffect(() => {
  for (const { link } of rows.value) if (!(link.id in labels)) labels[link.id] = link.label
})

const update = (l: Link, patch: Partial<Link>) => net.saveLink({ ...l, ...patch })
function saveLabel(l: Link) {
  if ((labels[l.id] ?? '') !== l.label) update(l, { label: labels[l.id] ?? '' })
}

const confirming = ref<number>()
async function remove(l: Link) {
  if (confirming.value !== l.id) return (confirming.value = l.id)
  confirming.value = undefined
  await net.deleteLink(l.id)
}

const fresh = reactive({ target: undefined as number | undefined, kind: 'lan' as LinkKind, label: '' })
async function add() {
  if (!fresh.target) return
  await net.saveLink({ source: props.deviceId, target: fresh.target, kind: fresh.kind, label: fresh.label })
  Object.assign(fresh, { target: undefined, kind: 'lan', label: '' })
}
</script>

<template>
  <div class="space-y-2">
    <div v-for="{ link: l, other } in rows" :key="l.id" class="space-y-1.5 rounded-xl border border-default p-2">
      <div class="flex items-center gap-2">
        <span class="h-0.5 w-5 shrink-0 rounded" :style="{ background: linkKinds[l.kind]?.color }" />
        <UIcon :name="deviceTypes[other!.type]?.icon" class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">{{ other!.name }}</span>
        <UButton
          icon="i-lucide-trash-2" size="xs" color="error" variant="ghost"
          :label="confirming === l.id ? 'Точно?' : undefined" @click="remove(l)"
        />
      </div>
      <div class="flex items-center gap-2">
        <USelect :model-value="l.kind" :items="linkItems" size="sm" class="w-40 shrink-0" @update:model-value="(k: any) => update(l, { kind: k })" />
        <UInput v-model="labels[l.id]" placeholder="подпись на линии" size="sm" class="min-w-0 flex-1" @blur="saveLabel(l)" @keydown.enter.prevent="saveLabel(l)" />
      </div>
    </div>

    <div class="space-y-1.5 rounded-xl border border-dashed border-default p-2">
      <USelectMenu v-model="fresh.target" :items="otherDevices" value-key="value" placeholder="Связать с устройством…" size="sm" class="w-full" />
      <div class="flex items-center gap-2">
        <USelect v-model="fresh.kind" :items="linkItems" size="sm" class="w-40 shrink-0" />
        <UInput v-model="fresh.label" placeholder="подпись" size="sm" class="min-w-0 flex-1" @keydown.enter.prevent="add" />
        <UButton icon="i-lucide-plus" size="sm" :disabled="!fresh.target" @click="add" />
      </div>
    </div>
    <p class="text-xs text-muted">Связи сохраняются сразу, без кнопки «Сохранить».</p>
  </div>
</template>
