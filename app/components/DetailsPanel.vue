<script setup lang="ts">
// Right-hand panel: everything about the selected device, link or zone.
// It is not a modal, so the map stays usable while it is open.
const emit = defineEmits<{ focus: [deviceId: number] }>()
const net = useNetwork()
const { selection, devices, links, zones, deviceById, zoneById, health, addressStatus } = net
const toast = useToast()

const editing = ref(false)
const confirmDelete = ref(false)
watch(selection, () => {
  editing.value = false
  confirmDelete.value = false
  newLink.open = false
})

const device = computed(() => (selection.value?.kind === 'device' ? deviceById(selection.value.id) : undefined))
const link = computed(() => (selection.value?.kind === 'link' ? links.value.find(l => l.id === selection.value!.id) : undefined))
const zone = computed(() => (selection.value?.kind === 'zone' ? zoneById(selection.value.id) : undefined))

// ── device ──────────────────────────────────────────────────────────────
const statusText = computed(() => {
  const h = health(device.value!.id)
  const ms = h.rtt != null ? ` · ${fmtRtt(h.rtt)}` : ''
  return {
    off: { text: 'Не проверяется', color: 'neutral' as const },
    unknown: { text: 'Проверяется…', color: 'neutral' as const },
    up: { text: `В сети${ms}`, color: 'success' as const },
    partial: { text: `Отвечают ${h.up} из ${h.total}${ms}`, color: 'warning' as const },
    down: { text: 'Не отвечает', color: 'error' as const },
  }[h.state]
})

// Each address row carries its own ping switch: a menu of intervals that
// saves the device straight away.
function pingMenu(index: number) {
  return [pingIntervals.map(s => ({
    label: s ? pingIntervalLabel(s) : 'Не пинговать',
    icon: (device.value!.addresses[index]!.ping ?? 0) === s ? 'i-lucide-check' : undefined,
    onSelect: () => setPing(index, s),
  }))]
}
async function setPing(index: number, seconds: number) {
  const d = device.value!
  const addresses = d.addresses.map((a, i) => (i === index ? { ...a, ping: seconds } : a))
  await net.saveDevice({ ...d, addresses })
}
function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  return s < 60 ? `${s} с назад` : `${Math.round(s / 60)} мин назад`
}

const webServices = computed(() => device.value?.services.filter(isWebService) ?? [])
const otherServices = computed(() => device.value?.services.filter(s => !isWebService(s)) ?? [])

const deviceLinks = computed(() => {
  const d = device.value
  if (!d) return []
  return links.value
    .filter(l => l.source === d.id || l.target === d.id)
    .map(l => ({ link: l, other: deviceById(l.source === d.id ? l.target : l.source)! }))
    .filter(x => x.other)
})

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.add({ title: 'Скопировано', description: text, icon: 'i-lucide-clipboard-check', duration: 1500 })
}

async function saveDevice(d: Partial<Device>) {
  await net.saveDevice(d)
  editing.value = false
}

async function removeDevice() {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await net.deleteDevice(device.value!.id)
}

const newLink = reactive({ open: false, target: undefined as number | undefined, kind: 'lan' as LinkKind, label: '' })
const otherDevices = computed(() => devices.value
  .filter(d => d.id !== device.value?.id)
  .map(d => ({ value: d.id, label: d.name, icon: deviceTypes[d.type]?.icon })))
async function addLink() {
  if (!newLink.target || !device.value) return
  await net.saveLink({ source: device.value.id, target: newLink.target, kind: newLink.kind, label: newLink.label })
  Object.assign(newLink, { open: false, target: undefined, kind: 'lan', label: '' })
}

// ── link ────────────────────────────────────────────────────────────────
const linkDraft = ref<Partial<Link>>({})
watch(link, l => (linkDraft.value = l ? { ...l } : {}), { immediate: true })
async function saveLink() {
  await net.saveLink(linkDraft.value)
  toast.add({ title: 'Связь сохранена', icon: 'i-lucide-check', duration: 1500 })
}
async function removeLink() {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await net.deleteLink(link.value!.id)
}

// ── zone ────────────────────────────────────────────────────────────────
const zoneDraft = ref<Partial<Zone>>({})
watch(zone, z => (zoneDraft.value = z ? { ...z } : {}), { immediate: true })
const zoneMembers = computed(() => devices.value.filter(d => d.zoneId === zone.value?.id))
async function saveZone() {
  await net.saveZone(zoneDraft.value)
  toast.add({ title: 'Зона сохранена', icon: 'i-lucide-check', duration: 1500 })
}
async function removeZone() {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await net.deleteZone(zone.value!.id)
}

const linkItems = toItems(linkKinds)
const zoneKindItems = toItems(zoneKinds)
</script>

<template>
  <Transition name="panel">
    <aside v-if="device || link || zone" class="panel">
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="absolute top-3 right-3 z-10" @click="selection = null" />

      <!-- ── Device ─────────────────────────────────────────────── -->
      <div v-if="device && editing" class="p-5">
        <h2 class="mb-4 text-lg font-semibold">Редактирование</h2>
        <DeviceForm :key="device.id" :device="device" @save="saveDevice" @cancel="editing = false" />
      </div>

      <div v-else-if="device" class="flex min-h-full flex-col">
        <div class="hero" :style="{ '--zone': zoneColor(zoneById(device.zoneId)?.color ?? 'zinc') }">
          <DeviceArt :type="device.type" :accent="meshAccent(device)" :size="96" />
          <div class="min-w-0">
            <h2 class="truncate text-xl font-bold tracking-tight text-highlighted">{{ device.name }}</h2>
            <div class="mt-0.5 text-sm text-muted">{{ deviceTypes[device.type]?.label }}<template v-if="device.os"> · {{ device.os }}</template></div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <UBadge :color="statusText.color" variant="subtle" class="gap-1.5">
                <MapStatusDot :id="device.id" size="sm" />
                {{ statusText.text }}
              </UBadge>
              <UBadge v-if="zoneById(device.zoneId)" color="neutral" variant="outline" :icon="zoneKinds[zoneById(device.zoneId)!.kind]?.icon">
                {{ zoneById(device.zoneId)!.name }}
              </UBadge>
            </div>
          </div>
        </div>

        <div class="flex-1 space-y-6 p-5">
          <p v-if="device.description" class="text-sm text-default">{{ device.description }}</p>

          <section v-if="device.addresses.length">
            <h3 class="section-title">Адреса</h3>
            <ul class="divide-y divide-default overflow-hidden rounded-xl border border-default">
              <li v-for="(a, i) in device.addresses" :key="i" class="group flex items-center gap-3 px-3 py-2 hover:bg-elevated/60">
                <span class="kind" :style="{ '--c': addressKinds[a.kind]?.color }">{{ addressKinds[a.kind]?.short }}</span>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-mono text-[13px] text-highlighted">{{ a.value }}</div>
                  <div class="text-xs text-muted">{{ addressKinds[a.kind]?.label }}<template v-if="a.label"> · {{ a.label }}</template></div>
                </div>
                <UDropdownMenu v-if="a.kind !== 'mac'" :items="pingMenu(i)" :content="{ align: 'end' }">
                  <button
                    v-if="a.ping" type="button" class="ping-pill"
                    :class="addressStatus(device.id, a)?.state ?? 'unknown'"
                    :title="`${pingIntervalLabel(a.ping)}${addressStatus(device.id, a) ? `, проверено ${ago(addressStatus(device.id, a)!.checkedAt)}` : ''}`"
                  >
                    <span class="size-1.5 rounded-full bg-current" />
                    <template v-if="!addressStatus(device.id, a)">…</template>
                    <template v-else-if="addressStatus(device.id, a)!.state === 'up'">{{ fmtRtt(addressStatus(device.id, a)!.rtt) || 'ок' }}</template>
                    <template v-else>нет</template>
                  </button>
                  <UButton
                    v-else icon="i-lucide-radar" size="xs" color="neutral" variant="ghost"
                    class="opacity-0 group-hover:opacity-60" title="Пинговать этот адрес"
                  />
                </UDropdownMenu>
                <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" class="opacity-0 group-hover:opacity-100" @click="copy(a.value)" />
              </li>
            </ul>
          </section>

          <section v-if="webServices.length">
            <h3 class="section-title">Веб-сервисы</h3>
            <ul class="space-y-1.5">
              <li v-for="(s, i) in webServices" :key="i" class="flex items-start gap-2 text-sm">
                <UIcon name="i-lucide-dot" class="mt-0.5 size-4 shrink-0 text-muted" />
                <div class="min-w-0">
                  <span class="font-medium text-highlighted">{{ s.name }}</span>
                  <span v-if="s.note" class="text-muted"> — {{ s.note }}</span>
                  <div class="flex flex-wrap gap-x-3 text-xs">
                    <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="font-mono text-muted hover:underline">{{ shortUrl(s.url) }}</a>
                    <a v-if="s.localUrl" :href="s.localUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-0.5 font-mono text-primary hover:underline">
                      <UIcon name="i-lucide-house" class="size-3" />{{ shortUrl(s.localUrl) }}
                    </a>
                    <a v-if="s.publicUrl" :href="s.publicUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-0.5 font-mono text-sky-500 hover:underline">
                      <UIcon name="i-lucide-globe" class="size-3" />{{ shortUrl(s.publicUrl) }}
                    </a>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section v-if="otherServices.length">
            <h3 class="section-title">Также работает</h3>
            <div class="flex flex-wrap gap-1.5">
              <UTooltip v-for="(s, i) in otherServices" :key="i" :text="s.note" :disabled="!s.note">
                <UBadge color="neutral" variant="soft" :label="s.name" />
              </UTooltip>
            </div>
          </section>

          <section>
            <div class="mb-2 flex items-center justify-between">
              <h3 class="section-title !mb-0">Связи</h3>
              <UButton icon="i-lucide-plus" label="Связь" size="xs" color="neutral" variant="soft" @click="newLink.open = !newLink.open" />
            </div>
            <div v-if="newLink.open" class="mb-3 space-y-2 rounded-xl border border-default bg-elevated/50 p-3">
              <USelectMenu v-model="newLink.target" :items="otherDevices" value-key="value" placeholder="С каким устройством" class="w-full" />
              <div class="flex gap-2">
                <USelect v-model="newLink.kind" :items="linkItems" class="w-40" />
                <UInput v-model="newLink.label" placeholder="подпись" class="flex-1" />
              </div>
              <div class="flex justify-end">
                <UButton label="Добавить" size="sm" :disabled="!newLink.target" @click="addLink" />
              </div>
            </div>
            <ul v-if="deviceLinks.length" class="space-y-1">
              <li v-for="{ link: l, other } in deviceLinks" :key="l.id" class="link-row" title="Изменить связь" @click="selection = { kind: 'link', id: l.id }">
                <span class="h-0.5 w-5 shrink-0 rounded" :style="{ background: linkKinds[l.kind]?.color }" />
                <span class="text-xs text-muted">{{ linkKinds[l.kind]?.label }}</span>
                <UIcon name="i-lucide-arrow-right" class="size-3.5 text-dimmed" />
                <button class="truncate font-medium text-highlighted hover:underline" title="Перейти к устройству" @click.stop="emit('focus', other.id)">{{ other.name }}</button>
                <span v-if="l.label" class="ml-auto truncate text-xs text-muted">{{ l.label }}</span>
                <UIcon name="i-lucide-pencil" class="edit size-3.5 shrink-0 text-muted" :class="{ 'ml-auto': !l.label }" />
              </li>
            </ul>
            <p v-else-if="!newLink.open" class="text-sm text-muted">Связей нет. На карте их можно провести мышью от точки на краю устройства.</p>
          </section>

          <section v-if="device.notes">
            <h3 class="section-title">Заметки</h3>
            <p class="whitespace-pre-line text-sm text-default">{{ device.notes }}</p>
          </section>
        </div>

        <div class="sticky bottom-0 flex gap-2 border-t border-default bg-default/90 p-4 backdrop-blur">
          <UButton icon="i-lucide-pencil" label="Изменить" class="flex-1 justify-center" @click="editing = true" />
          <UButton icon="i-lucide-trash-2" :label="confirmDelete ? 'Точно удалить?' : undefined" color="error" variant="soft" @click="removeDevice" />
        </div>
      </div>

      <!-- ── Link ───────────────────────────────────────────────── -->
      <div v-else-if="link" class="space-y-5 p-5">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider" :style="{ color: linkKinds[link.kind]?.color }">Связь</div>
          <h2 class="mt-1 flex items-center gap-2 text-lg font-bold text-highlighted">
            <button class="hover:underline" @click="emit('focus', link.source)">{{ deviceById(link.source)?.name }}</button>
            <UIcon name="i-lucide-arrow-left-right" class="size-4 text-muted" />
            <button class="hover:underline" @click="emit('focus', link.target)">{{ deviceById(link.target)?.name }}</button>
          </h2>
        </div>
        <UFormField label="Тип">
          <USelect v-model="linkDraft.kind" :items="linkItems" class="w-full" />
        </UFormField>
        <UFormField label="Подпись на линии">
          <UInput v-model="linkDraft.label" class="w-full" />
        </UFormField>
        <UFormField label="Заметки">
          <UTextarea v-model="linkDraft.notes" :rows="4" autoresize class="w-full" />
        </UFormField>
        <div class="flex gap-2">
          <UButton icon="i-lucide-check" label="Сохранить" class="flex-1 justify-center" @click="saveLink" />
          <UButton icon="i-lucide-trash-2" :label="confirmDelete ? 'Точно удалить?' : undefined" color="error" variant="soft" @click="removeLink" />
        </div>
      </div>

      <!-- ── Zone ───────────────────────────────────────────────── -->
      <div v-else-if="zone" class="space-y-5 p-5">
        <div class="text-xs font-semibold uppercase tracking-wider" :style="{ color: zoneColor(zone.color) }">Зона</div>
        <UFormField label="Название">
          <UInput v-model="zoneDraft.name" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Тип">
            <USelect v-model="zoneDraft.kind" :items="zoneKindItems" class="w-full" />
          </UFormField>
          <UFormField label="Подсеть">
            <UInput v-model="zoneDraft.subnet" placeholder="192.168.1.0/24" class="w-full font-mono" />
          </UFormField>
        </div>
        <UFormField label="Цвет">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(hex, name) in zoneColors" :key="name" type="button"
              class="size-7 rounded-full ring-offset-2 ring-offset-(--ui-bg) transition"
              :class="zoneDraft.color === name ? 'ring-2 ring-(--ui-text)' : 'hover:scale-110'"
              :style="{ background: hex }" :title="name"
              @click="zoneDraft.color = name"
            />
          </div>
        </UFormField>
        <UFormField label="Описание">
          <UTextarea v-model="zoneDraft.description" :rows="3" autoresize class="w-full" />
        </UFormField>
        <section v-if="zoneMembers.length">
          <h3 class="section-title">Устройства · {{ zoneMembers.length }}</h3>
          <div class="flex flex-wrap gap-1.5">
            <UButton v-for="d in zoneMembers" :key="d.id" :label="d.name" :icon="deviceTypes[d.type]?.icon" size="xs" color="neutral" variant="outline" @click="emit('focus', d.id)" />
          </div>
        </section>
        <div class="flex gap-2">
          <UButton icon="i-lucide-check" label="Сохранить" class="flex-1 justify-center" @click="saveZone" />
          <UButton icon="i-lucide-trash-2" :label="confirmDelete ? 'Удалить зону? Устройства останутся' : undefined" color="error" variant="soft" @click="removeZone" />
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.panel {
  position: absolute; top: 72px; right: 12px; bottom: 12px; width: min(440px, calc(100vw - 24px)); z-index: 20;
  overflow-y: auto; border-radius: 20px; border: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg) 92%, transparent); backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px -20px rgb(0 0 0 / .35);
}
.hero {
  display: flex; align-items: center; gap: 16px; padding: 28px 20px 20px;
  background: radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--zone) 22%, transparent), transparent 60%);
  border-bottom: 1px solid var(--ui-border);
}
.section-title { margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--ui-text-muted); }
.kind {
  flex: none; width: 44px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: .04em;
  padding: 3px 0; border-radius: 6px; color: var(--c); background: color-mix(in oklab, var(--c) 14%, transparent);
}
.ping-pill {
  cursor: pointer; display: inline-flex; align-items: center; gap: 5px; flex: none; padding: 1px 7px; border-radius: 999px;
  font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
}
.ping-pill.up { color: #16a34a; background: color-mix(in oklab, #22c55e 14%, transparent); }
.ping-pill.unknown { color: var(--ui-text-muted); background: var(--ui-bg-elevated); }
.ping-pill.down { color: #dc2626; background: color-mix(in oklab, #ef4444 14%, transparent); }
.link-row { cursor: pointer; display: flex; width: 100%; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; font-size: 14px; text-align: left; }
.link-row:hover { background: var(--ui-bg-elevated); }
.link-row .edit { opacity: 0; }
.link-row:hover .edit { opacity: 1; }
.panel-enter-active, .panel-leave-active { transition: transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s; }
.panel-enter-from, .panel-leave-to { transform: translateX(24px); opacity: 0; }
</style>
