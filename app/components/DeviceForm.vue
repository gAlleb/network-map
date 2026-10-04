<script setup lang="ts">
// Editing form for one device. Works on a copy; the parent decides what to do
// with it on save.
const props = defineProps<{ device: Partial<Device> }>()
const emit = defineEmits<{ save: [d: Partial<Device>], cancel: [] }>()
const { zones } = useNetwork()

const NO_ZONE = -1

const draft = reactive<Partial<Device>>(structuredClone(toRaw(props.device)))
draft.addresses ??= []
draft.services ??= []

const zone = computed({
  get: () => draft.zoneId ?? NO_ZONE,
  set: v => (draft.zoneId = v === NO_ZONE ? null : v),
})

const typeItems = computed(() => (Object.keys(deviceTypes) as DeviceType[]).map(value => ({ value, label: deviceTypes[value].label, icon: deviceTypes[value].icon })))
const zoneItems = computed(() => [{ value: NO_ZONE, label: 'Без зоны' }, ...zones.value.map(z => ({ value: z.id, label: z.name }))])
const addressItems = toItems(addressKinds)
const pingItems = pingIntervals.map(value => ({ value, label: value ? pingIntervalLabel(value) : 'не пинговать' }))

// Changing an address kind resets its ping to what that kind usually wants,
// unless the user already chose something by hand.
function setKind(a: Address, kind: AddressKind) {
  if ((a.ping ?? 0) === defaultPingInterval(a.kind)) a.ping = defaultPingInterval(kind)
  a.kind = kind
}

function addAddress() {
  const kind: AddressKind = draft.addresses!.length ? 'netbird' : 'lan'
  // Only the first address is pinged by default; more can be switched on.
  draft.addresses!.push({ kind, value: '', label: '', ping: draft.addresses!.some(a => a.ping) ? 0 : defaultPingInterval(kind) })
}
function addService() {
  draft.services!.push({ name: '', url: '', localUrl: '', publicUrl: '', note: '' })
}

function submit() {
  emit('save', { ...draft, name: draft.name?.trim() })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div class="flex items-center gap-4">
      <div class="grid size-20 shrink-0 place-items-center rounded-2xl bg-elevated">
        <DeviceArt :type="draft.type ?? 'other'" :size="64" />
      </div>
      <div class="flex-1 space-y-3">
        <UFormField label="Название" required>
          <UInput v-model="draft.name" placeholder="Например, nas2" class="w-full" autofocus />
        </UFormField>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Тип">
        <USelect v-model="draft.type" :items="typeItems" class="w-full" />
      </UFormField>
      <UFormField label="Зона">
        <USelect v-model="zone" :items="zoneItems" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Описание">
      <UInput v-model="draft.description" placeholder="Что это и зачем" class="w-full" />
    </UFormField>
    <UFormField label="Система">
      <UInput v-model="draft.os" placeholder="Debian 13, Proxmox VE, iOS…" class="w-full" />
    </UFormField>

    <USeparator label="Адреса" />
    <div class="space-y-2">
      <div v-for="(a, i) in draft.addresses" :key="i" class="space-y-1.5 rounded-xl border border-default p-2">
        <div class="flex items-center gap-2">
          <USelect :model-value="a.kind" :items="addressItems" class="w-36 shrink-0" @update:model-value="(k: any) => setKind(a, k)" />
          <UInput v-model="a.value" placeholder="192.168.1.10" class="min-w-0 flex-1 font-mono" />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="draft.addresses!.splice(i, 1)" />
        </div>
        <div class="flex items-center gap-2">
          <UInput v-model="a.label" placeholder="подпись, например «дома»" class="min-w-0 flex-1" size="sm" />
          <USelect
            v-if="a.kind !== 'mac'"
            v-model="a.ping" :items="pingItems" size="sm" class="w-40 shrink-0"
            :icon="a.ping ? 'i-lucide-radar' : 'i-lucide-circle-off'"
          />
        </div>
      </div>
      <UButton icon="i-lucide-plus" label="Адрес" color="neutral" variant="soft" size="sm" @click="addAddress" />
    </div>

    <p class="text-xs text-muted">
      Пингует сервер карты. Индикатор зелёный, если отвечают все отмеченные адреса, жёлтый — если часть.
    </p>

    <USeparator label="Сервисы" />
    <p class="-mt-2 text-xs text-muted">С адресом http(s) — веб-сервис, попадает во вкладку «Сервисы». Без адреса — в «Также работает».</p>
    <div class="space-y-2">
      <div v-for="(s, i) in draft.services" :key="i" class="space-y-1.5 rounded-xl border border-default p-2">
        <div class="flex items-center gap-2">
          <UInput v-model="s.name" placeholder="Название" class="min-w-0 flex-1" />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="draft.services!.splice(i, 1)" />
        </div>
        <UInput v-model="s.url" placeholder="По IP: http://192.168.10.20:81" icon="i-lucide-network" size="sm" class="w-full font-mono" />
        <UInput v-model="s.localUrl" placeholder="Локальный домен: https://proxy.home.example" icon="i-lucide-house" size="sm" class="w-full font-mono" />
        <UInput v-model="s.publicUrl" placeholder="Из интернета: https://cloud.example.com" icon="i-lucide-globe" size="sm" class="w-full font-mono" />
        <UInput v-model="s.note" placeholder="заметка" size="sm" class="w-full" />
      </div>
      <UButton icon="i-lucide-plus" label="Сервис" color="neutral" variant="soft" size="sm" @click="addService" />
    </div>

    <template v-if="device.id">
      <USeparator label="Связи" />
      <LinksEditor :device-id="device.id" />
    </template>

    <UFormField label="Заметки">
      <UTextarea v-model="draft.notes" :rows="4" autoresize class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Отмена" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton type="submit" label="Сохранить" icon="i-lucide-check" />
    </div>
  </form>
</template>
