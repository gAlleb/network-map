<script setup lang="ts">
// All services from all devices in one place. Services still live on their
// devices; this view only gathers them and edits them in place.
const emit = defineEmits<{ focus: [deviceId: number] }>()
const net = useNetwork()
const { devices, zones, zoneById } = net
const { lang, t } = useLang()

const query = ref('')

interface Row { device: Device, index: number, service: Service }

// index stays the position in device.services, so edits land on the right entry.
const rows = computed<Row[]>(() => devices.value.flatMap(device =>
  device.services
    .map((service, index) => ({ device, index, service }))
    .filter(r => isWebService(r.service))))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r => [r.service.name, r.service.note, r.service.url, r.service.localUrl, r.service.publicUrl, r.device.name]
    .some(v => v?.toLowerCase().includes(q)))
})

// Grouped by zone in the same order as the scheme; devices outside zones last.
const groups = computed(() => {
  const order = [...zones.value].sort((a, b) => a.id - b.id)
  const out = order.map(z => ({ zone: z as Zone | undefined, rows: filtered.value.filter(r => r.device.zoneId === z.id) }))
  out.push({ zone: undefined, rows: filtered.value.filter(r => !zoneById(r.device.zoneId)) })
  return out.filter(g => g.rows.length)
})

const counts = computed(() => ({
  total: rows.value.length,
  local: rows.value.filter(r => r.service.localUrl).length,
  public: rows.value.filter(r => r.service.publicUrl).length,
}))

// ── editing ─────────────────────────────────────────────────────────────
const modal = reactive({ open: false, deviceId: undefined as number | undefined, index: -1, draft: {} as Service, confirm: false })
const deviceItems = computed(() => devices.value.map(d => ({ value: d.id, label: d.name, icon: deviceTypes[d.type]?.icon })))

function openNew() {
  Object.assign(modal, { open: true, deviceId: undefined, index: -1, draft: { name: '', url: '', localUrl: '', publicUrl: '', note: '' }, confirm: false })
}
function openEdit(r: Row) {
  Object.assign(modal, { open: true, deviceId: r.device.id, index: r.index, draft: { ...r.service }, confirm: false })
}

async function save() {
  const target = net.deviceById(modal.deviceId!)
  if (!target || !modal.draft.name?.trim()) return
  const editing = modal.index >= 0 ? rows.value.find(r => r.index === modal.index && r.device.id === modal.deviceId) : undefined
  const services = [...target.services]
  if (editing) services[modal.index] = modal.draft
  else services.push(modal.draft)
  await net.saveDevice({ ...target, services })
  modal.open = false
}

// Moving a service to another device: remove from the old, add to the new.
const originalDevice = ref<number>()
watch(() => modal.open, (o) => { if (o) originalDevice.value = modal.index >= 0 ? modal.deviceId : undefined })
async function saveOrMove() {
  if (originalDevice.value != null && originalDevice.value !== modal.deviceId) {
    const from = net.deviceById(originalDevice.value)!
    await net.saveDevice({ ...from, services: from.services.filter((_, i) => i !== modal.index) })
    modal.index = -1
  }
  await save()
}

async function remove() {
  if (!modal.confirm) return (modal.confirm = true)
  const d = net.deviceById(modal.deviceId!)!
  await net.saveDevice({ ...d, services: d.services.filter((_, i) => i !== modal.index) })
  modal.open = false
}

const initials = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
</script>

<template>
  <div class="services">
    <div class="mx-auto max-w-6xl px-4 pt-24 pb-16">
      <div class="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">{{ t('Services', 'Сервисы') }}</h1>
          <p class="mt-1 text-sm text-muted">
            <template v-if="lang === 'ru'">
              {{ counts.total }} всего · {{ counts.local }} по локальному домену · {{ counts.public }} из интернета.
              Всё, у чего есть веб-адрес; хранятся в карточках устройств.
            </template>
            <template v-else>
              {{ counts.total }} in total · {{ counts.local }} by local name · {{ counts.public }} from the internet.
              Everything with a web address; they live on device cards.
            </template>
          </p>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <UInput v-model="query" icon="i-lucide-search" :placeholder="t('Name, address, machine…', 'Название, адрес, машина…')" class="w-64" />
          <UButton icon="i-lucide-plus" :label="t('Service', 'Сервис')" @click="openNew" />
        </div>
      </div>

      <section v-for="g in groups" :key="g.zone?.id ?? 'none'" class="mb-8">
        <div class="mb-3 flex items-center gap-2">
          <span class="size-2.5 rounded-full" :style="{ background: zoneColor(g.zone?.color ?? 'zinc') }" />
          <h2 class="text-sm font-bold uppercase tracking-wider text-muted">{{ g.zone?.name ?? t('Outside zones', 'Вне зон') }}</h2>
          <span class="text-xs text-dimmed">{{ g.rows.length }}</span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="r in g.rows" :key="`${r.device.id}-${r.index}`"
            class="card group" :style="{ '--accent': typeColors[r.device.type] }"
          >
            <div class="flex items-start gap-3">
              <div class="avatar">{{ initials(r.service.name) }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="truncate font-semibold text-highlighted">{{ r.service.name }}</h3>
                  <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" class="ml-auto opacity-0 group-hover:opacity-100" @click="openEdit(r)" />
                </div>
                <button class="host" @click="emit('focus', r.device.id)">
                  <UIcon :name="deviceTypes[r.device.type]?.icon" class="size-3.5" />
                  {{ r.device.name }}
                  <MapStatusDot :id="r.device.id" size="sm" />
                </button>
              </div>
            </div>
            <p v-if="r.service.note" class="mt-2 text-xs text-muted">{{ r.service.note }}</p>
            <div v-if="r.service.url || r.service.localUrl || r.service.publicUrl" class="mt-3 space-y-1">
              <a v-if="r.service.localUrl" :href="r.service.localUrl" target="_blank" rel="noopener" class="link local">
                <UIcon name="i-lucide-house" class="size-3.5 shrink-0" /><span class="truncate">{{ shortUrl(r.service.localUrl) }}</span>
              </a>
              <a v-if="r.service.publicUrl" :href="r.service.publicUrl" target="_blank" rel="noopener" class="link public">
                <UIcon name="i-lucide-globe" class="size-3.5 shrink-0" /><span class="truncate">{{ shortUrl(r.service.publicUrl) }}</span>
              </a>
              <a v-if="r.service.url" :href="r.service.url" target="_blank" rel="noopener" class="link ip">
                <UIcon name="i-lucide-network" class="size-3.5 shrink-0" /><span class="truncate">{{ shortUrl(r.service.url) }}</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <p v-if="!groups.length" class="py-20 text-center text-muted">{{ t('Nothing found.', 'Ничего не найдено.') }}</p>
    </div>

    <UModal v-model:open="modal.open" :title="modal.index >= 0 ? t('Service', 'Сервис') : t('New service', 'Новый сервис')">
      <template #body>
        <form class="space-y-4" @submit.prevent="saveOrMove">
          <UFormField :label="t('Name', 'Название')" required>
            <UInput v-model="modal.draft.name" class="w-full" autofocus />
          </UFormField>
          <UFormField :label="t('On which machine', 'На какой машине')" required>
            <USelectMenu v-model="modal.deviceId" :items="deviceItems" value-key="value" :placeholder="t('Pick a device', 'Выберите устройство')" class="w-full" />
          </UFormField>
          <UFormField :label="t('By IP', 'По IP')">
            <UInput v-model="modal.draft.url" placeholder="http://192.168.10.20:81" icon="i-lucide-network" class="w-full font-mono" />
          </UFormField>
          <UFormField :label="t('Local name', 'Локальный домен')" :help="t('Opens only from inside the network', 'Открывается только изнутри сети')">
            <UInput v-model="modal.draft.localUrl" placeholder="https://proxy.home.example" icon="i-lucide-house" class="w-full font-mono" />
          </UFormField>
          <UFormField :label="t('From the internet', 'Из интернета')">
            <UInput v-model="modal.draft.publicUrl" placeholder="https://cloud.example.com" icon="i-lucide-globe" class="w-full font-mono" />
          </UFormField>
          <UFormField :label="t('Note', 'Заметка')">
            <UInput v-model="modal.draft.note" class="w-full" />
          </UFormField>
          <div class="flex gap-2 pt-2">
            <UButton v-if="modal.index >= 0" icon="i-lucide-trash-2" :label="modal.confirm ? t('Delete for sure?', 'Точно удалить?') : undefined" color="error" variant="soft" @click="remove" />
            <UButton :label="t('Cancel', 'Отмена')" color="neutral" variant="ghost" class="ml-auto" @click="modal.open = false" />
            <UButton type="submit" :label="t('Save', 'Сохранить')" icon="i-lucide-check" :disabled="!modal.deviceId || !modal.draft.name?.trim()" />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.services { position: absolute; inset: 0; overflow-y: auto; }
.card {
  padding: 14px; border-radius: 16px; border: 1px solid var(--ui-border); background: var(--ui-bg);
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.card:hover { border-color: color-mix(in oklab, var(--accent) 50%, var(--ui-border)); box-shadow: 0 10px 30px -18px var(--accent); transform: translateY(-1px); }
.avatar {
  display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex: none;
  font-size: 13px; font-weight: 800; color: white; letter-spacing: -.02em;
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 55%, #000));
}
.host { display: inline-flex; align-items: center; gap: 5px; margin-top: 1px; font-size: 12px; color: var(--ui-text-muted); }
.host:hover { color: var(--ui-text-highlighted); }
.link { display: flex; align-items: center; gap: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; min-width: 0; }
.link:hover span { text-decoration: underline; }
.link.local { color: var(--ui-primary); }
.link.public { color: #0ea5e9; }
.link.ip { color: var(--ui-text-muted); }
</style>
