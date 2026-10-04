<script setup lang="ts">
import { VueFlow, useVueFlow, type Connection, type Node, type Edge, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

type Mode = 'scheme' | 'map' | 'services'

const net = useNetwork()
const { zones, devices, links, statuses, selection, loaded } = net
const colorMode = useColorMode()
const { lang, setLang, t, L } = useLang()
useHead(() => ({ title: t('Network map', 'Карта сети'), htmlAttrs: { lang: lang.value } }))
const { fitView, findNode, screenToFlowCoordinate, onNodesInitialized } = useVueFlow('network')

// ── per-browser preferences ─────────────────────────────────────────────
function stored<T>(key: string, fallback: T) {
  const r = ref<T>(fallback) as Ref<T>
  try {
    const v = localStorage.getItem(`network-map:${key}`)
    if (v != null) r.value = JSON.parse(v)
  }
  catch { /* private window or blocked storage: defaults are fine */ }
  watch(r, v => { try { localStorage.setItem(`network-map:${key}`, JSON.stringify(v)) } catch {} }, { deep: true })
  return r
}
const mode = stored<Mode>('mode', 'map')
const hiddenKinds = stored<LinkKind[]>('hiddenKinds', [])
const showLabels = stored('showLabels', true)
const showMinimap = stored('showMinimap', true)
// Moving dashes, dots and status pulses repaint the whole edge layer every
// frame; on a big map that is most of the page's CPU. Off by default when the
// system asks for reduced motion.
const animate = stored('animate', !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// ── loading and polling ─────────────────────────────────────────────────
let poll: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  await net.load()
  await net.refreshStatus()
  poll = setInterval(net.refreshStatus, 10_000)
})
onBeforeUnmount(() => clearInterval(poll))

onNodesInitialized(() => fitView({ padding: 0.16, duration: 0 }))
watch(mode, (m) => {
  if (m !== 'services') nextTick(() => setTimeout(() => fitView({ padding: 0.12, duration: 500 }), 60))
})

// ── scheme layout ───────────────────────────────────────────────────────
// The schematic view ignores saved positions and lays everything out in
// columns, one per zone, with overlays (devices outside zones) in the middle.
const CARD_W = 210
const CARD_H = 56
const GAP = 12
const PAD = 20
const HEADER = 60
const COL_GAP = 150
const typeOrder: DeviceType[] = ['router', 'switch', 'ap', 'hypervisor', 'server', 'nas', 'vm', 'vps', 'desktop', 'laptop', 'phone', 'printer', 'tv', 'console', 'camera', 'mesh', 'internet', 'other']
const zoneOrder: ZoneKind[] = ['mobile', 'home', 'overlay', 'office', 'cloud', 'other']

function sortDevices(list: Device[]) {
  return [...list].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.name.localeCompare(b.name, 'ru'))
}

const schemeLayout = computed(() => {
  const zonePos = new Map<number, { x: number, y: number, width: number, height: number }>()
  const devPos = new Map<number, { x: number, y: number }>()

  type Column = { zone?: Zone, items: Device[] }
  const columns: Column[] = [...zones.value]
    .sort((a, b) => zoneOrder.indexOf(a.kind) - zoneOrder.indexOf(b.kind) || a.id - b.id)
    .map(z => ({ zone: z, items: sortDevices(devices.value.filter(d => d.zoneId === z.id)) }))
  const loose = sortDevices(devices.value.filter(d => d.zoneId == null || !zones.value.some(z => z.id === d.zoneId)))
  if (loose.length) {
    const at = columns.findIndex(c => c.zone && zoneOrder.indexOf(c.zone.kind) > zoneOrder.indexOf('overlay'))
    columns.splice(at < 0 ? columns.length : at, 0, { items: loose })
  }

  const heights = columns.map((c) => {
    const cols = c.items.length > 7 ? 2 : 1
    const rows = Math.max(1, Math.ceil(c.items.length / cols))
    return c.zone ? HEADER + rows * (CARD_H + GAP) - GAP + PAD : rows * (CARD_H + GAP * 3)
  })
  const tallest = Math.max(...heights, 0)

  let x = 0
  columns.forEach((c, i) => {
    const cols = c.items.length > 7 ? 2 : 1
    const width = c.zone ? PAD * 2 + cols * CARD_W + (cols - 1) * GAP : CARD_W
    if (c.zone) {
      zonePos.set(c.zone.id, { x, y: 0, width, height: heights[i]! })
      c.items.forEach((d, k) => devPos.set(d.id, {
        x: x + PAD + (k % cols) * (CARD_W + GAP),
        y: HEADER + Math.floor(k / cols) * (CARD_H + GAP),
      }))
    }
    else {
      // Overlays float in the middle of the picture, spaced out.
      const step = CARD_H + GAP * 3
      const top = (tallest - c.items.length * step) / 2
      c.items.forEach((d, k) => devPos.set(d.id, { x, y: top + k * step }))
    }
    x += width + COL_GAP
  })
  return { zonePos, devPos }
})

// ── nodes and edges ─────────────────────────────────────────────────────
const nodes = computed<Node[]>(() => {
  const isMap = mode.value !== 'scheme'
  const L = schemeLayout.value
  const zoneNodes: Node[] = zones.value.map((z) => {
    const r = isMap ? z : L.zonePos.get(z.id) ?? { x: z.x, y: z.y, width: z.width, height: z.height }
    return {
      id: `z${z.id}`,
      type: 'zone',
      position: { x: r.x, y: r.y },
      style: { width: `${r.width}px`, height: `${r.height}px` },
      data: { zoneId: z.id, editable: isMap },
      zIndex: -1,
      draggable: isMap,
      // Only the header moves a zone; its empty body pans the canvas.
      dragHandle: '.zone-header',
      connectable: false,
      selected: selection.value?.kind === 'zone' && selection.value.id === z.id,
    }
  })
  const deviceNodes: Node[] = devices.value.map(d => ({
    id: `d${d.id}`,
    type: isMap ? 'device' : 'scheme',
    position: isMap ? { x: d.x, y: d.y } : L.devPos.get(d.id) ?? { x: d.x, y: d.y },
    data: { deviceId: d.id },
    draggable: isMap,
    connectable: isMap,
    selected: selection.value?.kind === 'device' && selection.value.id === d.id,
  }))
  return [...zoneNodes, ...deviceNodes]
})

const focusDevice = computed(() => (selection.value?.kind === 'device' ? selection.value.id : null))

const edges = computed<Edge[]>(() => {
  const visible = links.value.filter(l => !hiddenKinds.value.includes(l.kind))
  // Spread links that share both ends: offsets ..., -1, 0, 1, ... times 34px.
  const pairs = new Map<string, number[]>()
  for (const l of visible) {
    const key = [l.source, l.target].sort((a, b) => a - b).join('-')
    pairs.set(key, [...(pairs.get(key) ?? []), l.id])
  }
  const offsetOf = (l: Link) => {
    const ids = pairs.get([l.source, l.target].sort((a, b) => a - b).join('-'))!
    // Normalise direction so the sign means the same side for both orders.
    const sign = l.source < l.target ? 1 : -1
    return (ids.indexOf(l.id) - (ids.length - 1) / 2) * 34 * sign
  }
  // In the scheme, cabling inside a zone is implied by the zone itself and
  // only adds noise; it fades out unless one of its ends is selected.
  const zoneOf = new Map(devices.value.map(d => [d.id, d.zoneId]))
  const quiet = (l: Link) => mode.value === 'scheme'
    && ['lan', 'wifi', 'hosted'].includes(l.kind)
    && zoneOf.get(l.source) != null && zoneOf.get(l.source) === zoneOf.get(l.target)
  return visible.map(l => ({
    id: `l${l.id}`,
    source: `d${l.source}`,
    target: `d${l.target}`,
    type: 'link',
    data: {
      linkId: l.id,
      kind: l.kind,
      label: showLabels.value ? l.label : '',
      dim: focusDevice.value != null
        ? l.source !== focusDevice.value && l.target !== focusDevice.value
        : quiet(l),
      offset: offsetOf(l),
    },
    selected: selection.value?.kind === 'link' && selection.value.id === l.id,
  }))
})

// ── stats ───────────────────────────────────────────────────────────────
const pinged = computed(() => devices.value.filter(d => net.health(d.id).state !== 'off'))
const upCount = computed(() => pinged.value.filter(d => ['up', 'partial'].includes(net.health(d.id).state)).length)

// ── selection and focus ─────────────────────────────────────────────────
function onNodeClick({ node }: { node: Node }) {
  if (node.type === 'zone') selection.value = { kind: 'zone', id: node.data.zoneId }
  else selection.value = { kind: 'device', id: node.data.deviceId }
}
function onEdgeClick({ edge }: { edge: Edge }) {
  selection.value = { kind: 'link', id: edge.data.linkId }
}
function focus(id: number) {
  selection.value = { kind: 'device', id }
  const go = () => fitView({ nodes: [`d${id}`], maxZoom: 1.25, duration: 600, padding: 1.2 })
  if (mode.value === 'services') {
    mode.value = 'map'
    setTimeout(go, 150)
  }
  else go()
}

const searchItems = computed(() => devices.value.map(d => ({
  value: d.id,
  label: d.name,
  icon: deviceTypes[d.type]?.icon,
  suffix: primaryAddress(d)?.value,
  // Every address is searchable, not only the one on the card.
  search: [d.name, d.description, ...d.addresses.map(a => a.value)].join(' '),
})))
const searchPick = ref<number>()
watch(searchPick, (id) => {
  if (id != null) focus(id)
  nextTick(() => (searchPick.value = undefined))
})

// ── dragging (map view) ─────────────────────────────────────────────────
// A zone carries the devices that sit inside it; a device dropped into a
// zone joins it.
let carried: { start: { x: number, y: number }, members: { id: number, x: number, y: number }[] } | null = null

const DEVICE_W = 128
const DEVICE_H = 124
function zoneAt(cx: number, cy: number): Zone | undefined {
  return zones.value
    .filter(z => cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0]
}

function onDragStart(e: NodeDragEvent) {
  const zn = e.nodes.find(n => n.type === 'zone')
  if (!zn || e.nodes.length > 1) return (carried = null)
  const z = zones.value.find(z => z.id === zn.data.zoneId)!
  carried = {
    start: { ...zn.position },
    members: devices.value
      .filter((d) => {
        const cx = d.x + DEVICE_W / 2
        const cy = d.y + DEVICE_H / 2
        return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height
      })
      .map(d => ({ id: d.id, x: d.x, y: d.y })),
  }
}

function onDrag(e: NodeDragEvent) {
  if (!carried) return
  const zn = e.nodes[0]!
  const dx = zn.position.x - carried.start.x
  const dy = zn.position.y - carried.start.y
  for (const m of carried.members) {
    const n = findNode(`d${m.id}`)
    if (n) n.position = { x: m.x + dx, y: m.y + dy }
  }
}

function onDragStop(e: NodeDragEvent) {
  const devs: { id: number, x: number, y: number, zoneId?: number | null }[] = []
  const zs: { id: number, x: number, y: number }[] = []
  for (const n of e.nodes) {
    const p = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    if (n.type === 'zone') {
      zs.push({ id: n.data.zoneId, ...p })
      if (carried) {
        const dx = n.position.x - carried.start.x
        const dy = n.position.y - carried.start.y
        for (const m of carried.members) devs.push({ id: m.id, x: Math.round(m.x + dx), y: Math.round(m.y + dy) })
      }
    }
    else {
      const d = devices.value.find(d => d.id === n.data.deviceId)!
      const z = zoneAt(p.x + DEVICE_W / 2, p.y + DEVICE_H / 2)
      devs.push({ id: d.id, ...p, zoneId: z?.id ?? (d.zoneId && zones.value.some(x => x.id === d.zoneId) ? null : d.zoneId) })
    }
  }
  carried = null
  net.queuePositions({ devices: devs, zones: zs })
}

function onZoneResized(zoneId: number, r: { x: number, y: number, width: number, height: number }) {
  net.queuePositions({ zones: [{ id: zoneId, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }] })
}

// ── drawing links ───────────────────────────────────────────────────────
const linkModal = reactive({ open: false, source: 0, target: 0, kind: 'lan' as LinkKind, label: '' })
function onConnect(c: Connection) {
  const source = Number(c.source.slice(1))
  const target = Number(c.target.slice(1))
  if (source === target) return
  Object.assign(linkModal, { open: true, source, target, kind: guessKind(source, target), label: '' })
}
// The likeliest link between two devices, so most connects are one click.
function guessKind(a: number, b: number): LinkKind {
  const da = net.deviceById(a)
  const db = net.deviceById(b)
  const types = [da?.type, db?.type]
  const names = `${da?.name} ${db?.name}`.toLowerCase()
  if (types.includes('mesh')) return names.includes('ygg') ? 'yggdrasil' : 'netbird'
  if (types.includes('internet')) return 'internet'
  if (types.includes('vm') && (types.includes('hypervisor') || types.includes('server'))) return 'hosted'
  if (da?.zoneId !== db?.zoneId) return 'wireguard'
  if (types.some(t => t === 'phone' || t === 'laptop' || t === 'tv')) return 'wifi'
  return 'lan'
}
async function createLink() {
  await net.saveLink({ source: linkModal.source, target: linkModal.target, kind: linkModal.kind, label: linkModal.label })
  linkModal.open = false
}

// ── adding things ───────────────────────────────────────────────────────
const deviceModal = ref(false)
const newDevice = ref<Partial<Device>>({})
function openNewDevice() {
  const zoneId = selection.value?.kind === 'zone' ? selection.value.id : (zones.value.find(z => z.kind === 'home')?.id ?? null)
  newDevice.value = { type: 'server', zoneId, addresses: [{ kind: 'lan', value: '', ping: 20 }], services: [] }
  deviceModal.value = true
}
async function createDevice(d: Partial<Device>) {
  // New devices land in the middle of the screen, or inside their zone if
  // the middle of the screen is somewhere else.
  const c = screenToFlowCoordinate({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  let pos = { x: c.x - DEVICE_W / 2, y: c.y - DEVICE_H / 2 }
  const z = net.zoneById(d.zoneId ?? null)
  if (z && zoneAt(c.x, c.y)?.id !== z.id) pos = { x: z.x + 40 + Math.random() * Math.max(0, z.width - 220), y: z.y + 70 + Math.random() * Math.max(0, z.height - 220) }
  const saved = await net.saveDevice({ ...d, x: Math.round(pos.x), y: Math.round(pos.y) })
  deviceModal.value = false
  selection.value = { kind: 'device', id: saved.id }
}

async function createZone() {
  const c = screenToFlowCoordinate({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const z = await net.saveZone({ name: t('New zone', 'Новая зона'), kind: 'other', color: 'teal', x: Math.round(c.x - 250), y: Math.round(c.y - 160), width: 500, height: 320 })
  if (mode.value !== 'map') mode.value = 'map'
  selection.value = { kind: 'zone', id: z.id }
}

const linkItems = computed(() => toItems(linkKinds, lang.value))
const menu = computed(() => [[
  { label: t('Link labels', 'Подписи связей'), icon: 'i-lucide-tag', type: 'checkbox' as const, checked: showLabels.value, onUpdateChecked: (v: boolean) => (showLabels.value = v) },
  { label: t('Minimap', 'Мини-карта'), icon: 'i-lucide-map', type: 'checkbox' as const, checked: showMinimap.value, onUpdateChecked: (v: boolean) => (showMinimap.value = v) },
  { label: t('Animation', 'Анимация'), icon: 'i-lucide-activity', type: 'checkbox' as const, checked: animate.value, onUpdateChecked: (v: boolean) => (animate.value = v) },
], [
  { label: t('Fit all', 'Показать всё'), icon: 'i-lucide-scan', onSelect: () => fitView({ padding: 0.12, duration: 500 }) },
  { label: t('Download JSON', 'Скачать JSON'), icon: 'i-lucide-download', to: '/api/export', target: '_blank', external: true },
  { label: t('Load JSON…', 'Загрузить JSON…'), icon: 'i-lucide-upload', onSelect: () => importInput.value?.click() },
]])

// The current language is the one ticked; the button shows its code.
const langMenu = computed(() => [([['en', 'English'], ['ru', 'Русский']] as const).map(([l, label]) => ({
  label, type: 'checkbox' as const, checked: lang.value === l, onUpdateChecked: () => setLang(l),
}))])

// ── restore from a backup ───────────────────────────────────────────────
const importInput = ref<HTMLInputElement>()
const importModal = reactive({ open: false, name: '', data: null as NetworkData | null, busy: false })

async function pickImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    if (!Array.isArray(data?.zones) || !Array.isArray(data?.devices) || !Array.isArray(data?.links)) throw new Error(t('no zones, devices and links', 'нет zones, devices и links'))
    Object.assign(importModal, { open: true, name: file.name, data })
  }
  catch (err: any) {
    useToast().add({ title: t('Not a map file', 'Это не файл карты'), description: err?.message, color: 'error', icon: 'i-lucide-triangle-alert' })
  }
}

async function runImport() {
  importModal.busy = true
  try {
    await $fetch('/api/import', { method: 'POST', body: importModal.data })
    selection.value = null
    await net.load()
    importModal.open = false
    nextTick(() => fitView({ padding: 0.12, duration: 500 }))
  }
  catch (err: any) {
    useToast().add({ title: t('Could not load', 'Не удалось загрузить'), description: err?.data?.statusMessage ?? err?.message, color: 'error', icon: 'i-lucide-triangle-alert' })
  }
  finally {
    importModal.busy = false
  }
}

function toggleKind(k: LinkKind) {
  hiddenKinds.value = hiddenKinds.value.includes(k) ? hiddenKinds.value.filter(x => x !== k) : [...hiddenKinds.value, k]
}
const usedKinds = computed(() => (Object.keys(linkKinds) as LinkKind[]).filter(k => links.value.some(l => l.kind === k)))
</script>

<template>
  <div class="relative h-dvh w-full overflow-hidden bg-(--ui-bg-muted)" :class="{ 'no-motion': !animate }">
    <!-- ── top bar ──────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="flex items-center gap-2.5 pr-2">
        <div class="logo"><UIcon name="i-lucide-waypoints" class="size-5" /></div>
        <div class="hidden leading-tight sm:block">
          <div class="text-sm font-bold text-highlighted">{{ t('Network map', 'Карта сети') }}</div>
          <div class="text-[11px] text-muted">{{ t('home · office · cloud', 'дом · офис · облако') }}</div>
        </div>
      </div>

      <div class="seg">
        <button :class="{ on: mode === 'scheme' }" @click="mode = 'scheme'"><UIcon name="i-lucide-layout-grid" class="size-4" /><span class="hidden md:inline">{{ t('Scheme', 'Схема') }}</span></button>
        <button :class="{ on: mode === 'map' }" @click="mode = 'map'"><UIcon name="i-lucide-map" class="size-4" /><span class="hidden md:inline">{{ t('Map', 'Карта') }}</span></button>
        <button :class="{ on: mode === 'services' }" @click="mode = 'services'; selection = null"><UIcon name="i-lucide-layout-list" class="size-4" /><span class="hidden md:inline">{{ t('Services', 'Сервисы') }}</span></button>
      </div>

      <USelectMenu
        v-model="searchPick"
        :items="searchItems"
        value-key="value"
        :filter-fields="['label', 'search']"
        :placeholder="t('Find a device or IP', 'Найти устройство или IP')"
        icon="i-lucide-search"
        class="w-44 lg:w-64"
        :search-input="{ placeholder: t('Name or address…', 'Имя или адрес…') }"
      >
        <template #item-trailing="{ item }">
          <span class="font-mono text-xs text-muted">{{ item.suffix }}</span>
        </template>
      </USelectMenu>

      <div v-if="pinged.length" class="stat" :title="t('devices answer ping', 'устройств отвечают на пинг')">
        <span class="size-2 rounded-full" :class="upCount === pinged.length ? 'bg-green-500' : 'bg-amber-500'" />
        <span class="tabular-nums">{{ upCount }}<span class="text-muted">/{{ pinged.length }}</span></span>
        <span class="hidden text-muted lg:inline">{{ t('online', 'в сети') }}</span>
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <UButton icon="i-lucide-square-dashed" :label="t('Zone', 'Зона')" color="neutral" variant="ghost" class="hidden md:inline-flex" @click="createZone" />
        <UButton icon="i-lucide-plus" :label="t('Device', 'Устройство')" @click="openNewDevice" />
        <input ref="importInput" type="file" accept="application/json,.json" class="hidden" @change="pickImport">
        <UDropdownMenu :items="menu" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
        <UDropdownMenu :items="langMenu" :content="{ align: 'end' }">
          <UButton icon="i-lucide-languages" :label="lang.toUpperCase()" :title="t('Interface language', 'Язык интерфейса')" color="neutral" variant="ghost" />
        </UDropdownMenu>
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral" variant="ghost"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        />
      </div>
    </header>

    <!-- ── canvas ───────────────────────────────────────────────── -->
    <ClientOnly>
      <div v-show="mode !== 'services'" class="absolute inset-0">
      <VueFlow
        id="network"
        :nodes="nodes"
        :edges="edges"
        :min-zoom="0.15"
        :max-zoom="2.5"
        :delete-key-code="null"
        :elevate-nodes-on-select="false"
        :elevate-edges-on-select="false"
        connection-mode="loose"
        :connection-radius="80"
        :connection-line-style="{ stroke: 'var(--ui-primary)', strokeWidth: 2, strokeDasharray: '6 4' }"
        :class="['flow', mode]"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="selection = null"
        @node-drag-start="onDragStart"
        @node-drag="onDrag"
        @node-drag-stop="onDragStop"
        @connect="onConnect"
      >
        <template #node-device="p"><MapDeviceNode v-bind="p" /></template>
        <template #node-scheme="p"><MapSchemeNode v-bind="p" /></template>
        <template #node-zone="p"><MapZoneNode v-bind="p" @resized="onZoneResized" /></template>
        <template #edge-link="p"><MapLinkEdge v-bind="p" /></template>

        <Background :gap="mode === 'map' ? 28 : 22" :size="1.4" :pattern-color="colorMode.value === 'dark' ? '#3f3f46' : '#d4d4d8'" />
        <Controls position="bottom-right" :show-interactive="false" class="controls" />
        <MiniMap
          v-if="showMinimap && mode === 'map'"
          position="bottom-right"
          class="minimap"
          pannable zoomable
          :node-color="(n: any) => n.type === 'zone' ? zoneColor(net.zoneById(n.data.zoneId)?.color ?? 'zinc') + '33' : '#71717a'"
          :mask-color="colorMode.value === 'dark' ? 'rgb(9 9 11 / .6)' : 'rgb(244 244 245 / .6)'"
        />
      </VueFlow>
      </div>
      <ServicesView v-if="mode === 'services'" @focus="focus" />
    </ClientOnly>

    <div v-if="!loaded" class="absolute inset-0 grid place-items-center">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
    </div>

    <!-- ── legend / filter ──────────────────────────────────────── -->
    <div v-show="mode !== 'services'" class="legend">
      <div class="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted">{{ t('Links', 'Связи') }}</div>
      <button v-for="k in usedKinds" :key="k" class="legend-row" :class="{ off: hiddenKinds.includes(k) }" @click="toggleKind(k)">
        <svg width="26" height="8" class="shrink-0"><line x1="1" y1="4" x2="25" y2="4" :stroke="linkKinds[k].color" :stroke-width="linkKinds[k].width ?? 1.5" :stroke-dasharray="linkKinds[k].dash" stroke-linecap="round" /></svg>
        <span>{{ L(linkKinds[k].label) }}</span>
      </button>
      <div v-if="mode === 'map'" class="mt-2 border-t border-default px-1 pt-2 text-[11px] leading-snug text-muted">
        {{ t('Drag from a handle on the edge of a device to another one to link them.', 'Тяните от точки на краю устройства к другому, чтобы связать.') }}
      </div>
    </div>

    <DetailsPanel v-if="mode !== 'services'" @focus="focus" />

    <!-- ── new device ───────────────────────────────────────────── -->
    <UModal v-model:open="deviceModal" :title="t('New device', 'Новое устройство')" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <DeviceForm v-if="deviceModal" :device="newDevice" @save="createDevice" @cancel="deviceModal = false" />
      </template>
    </UModal>

    <!-- ── new link ─────────────────────────────────────────────── -->
    <UModal v-model:open="linkModal.open" :title="t('New link', 'Новая связь')">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center justify-center gap-3 text-sm font-semibold text-highlighted">
            <span>{{ net.deviceById(linkModal.source)?.name }}</span>
            <UIcon name="i-lucide-arrow-left-right" class="size-4 text-muted" />
            <span>{{ net.deviceById(linkModal.target)?.name }}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="it in linkItems" :key="it.value" type="button"
              class="kind-pick" :class="{ on: linkModal.kind === it.value }"
              @click="linkModal.kind = it.value"
            >
              <svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" :stroke="linkKinds[it.value].color" stroke-width="2.5" :stroke-dasharray="linkKinds[it.value].dash" stroke-linecap="round" /></svg>
              {{ it.label }}
            </button>
          </div>
          <UFormField :label="t('Label on the line (optional)', 'Подпись на линии (необязательно)')">
            <UInput v-model="linkModal.label" class="w-full" @keydown.enter="createLink" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton :label="t('Cancel', 'Отмена')" color="neutral" variant="ghost" @click="linkModal.open = false" />
            <UButton :label="t('Link', 'Связать')" icon="i-lucide-link" @click="createLink" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ── restore from a backup ────────────────────────────────── -->
    <UModal v-model:open="importModal.open" :title="t('Load the map from a file', 'Загрузить карту из файла')">
      <template #body>
        <div class="space-y-4 text-sm">
          <p>
            {{ t('The whole current map will be replaced with', 'Вся текущая карта будет заменена содержимым') }} <b>{{ importModal.name }}</b>
            ({{ t('zones', 'зон') }}: {{ importModal.data?.zones.length }}, {{ t('devices', 'устройств') }}: {{ importModal.data?.devices.length }},
            {{ t('links', 'связей') }}: {{ importModal.data?.links.length }}).
          </p>
          <p class="text-muted">
            {{ t('The map now has', 'Сейчас на карте') }} {{ t('zones', 'зон') }}: {{ zones.length }}, {{ t('devices', 'устройств') }}: {{ devices.length }}, {{ t('links', 'связей') }}: {{ links.length }}.
            {{ t('If you need them, “Download JSON” first.', 'Если они нужны, сначала «Скачать JSON».') }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton :label="t('Cancel', 'Отмена')" color="neutral" variant="ghost" @click="importModal.open = false" />
            <UButton :label="t('Replace the map', 'Заменить карту')" icon="i-lucide-upload" color="error" :loading="importModal.busy" @click="runImport" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.topbar {
  position: absolute; top: 12px; left: 12px; right: 12px; z-index: 30; height: 52px;
  display: flex; align-items: center; gap: 10px; padding: 0 8px 0 10px;
  border-radius: 16px; border: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg) 85%, transparent); backdrop-filter: blur(16px);
  box-shadow: 0 10px 30px -15px rgb(0 0 0 / .25);
}
.logo {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: white;
  background: linear-gradient(135deg, #10b981, #0ea5e9 60%, #8b5cf6);
  box-shadow: 0 6px 16px -6px #10b981;
}
.seg { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--ui-bg-elevated); border: 1px solid var(--ui-border); }
.seg button {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 600; color: var(--ui-text-muted); transition: all .15s;
}
.seg button.on { background: var(--ui-bg); color: var(--ui-text-highlighted); box-shadow: 0 1px 3px rgb(0 0 0 / .12); }
.stat {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 10px;
  font-size: 13px; font-weight: 600; background: var(--ui-bg-elevated);
}
.legend {
  position: absolute; left: 12px; bottom: 12px; z-index: 10; width: 190px; padding: 10px;
  border-radius: 16px; border: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg) 88%, transparent); backdrop-filter: blur(12px);
}
.legend-row { display: flex; width: 100%; align-items: center; gap: 8px; padding: 3px 4px; border-radius: 7px; font-size: 12.5px; text-align: left; }
.legend-row:hover { background: var(--ui-bg-elevated); }
.legend-row.off { opacity: .35; }
.legend-row.off span { text-decoration: line-through; }
.kind-pick {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; font-size: 13px;
  border: 1px solid var(--ui-border); text-align: left; transition: all .12s;
}
.kind-pick:hover { background: var(--ui-bg-elevated); }
.kind-pick.on { border-color: var(--ui-primary); background: color-mix(in oklab, var(--ui-primary) 10%, transparent); font-weight: 600; }
.flow { width: 100%; height: 100%; }
</style>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
@import '@vue-flow/node-resizer/dist/style.css';

.vue-flow__node-device, .vue-flow__node-scheme, .vue-flow__node-zone { padding: 0; border: 0; background: transparent; box-shadow: none !important; }
.vue-flow__node.selected { outline: none; }
.vue-flow__edge.selected .vue-flow__edge-path { filter: drop-shadow(0 0 4px currentColor); }
.vue-flow__controls { border-radius: 12px; overflow: hidden; border: 1px solid var(--ui-border); box-shadow: none; margin-bottom: 12px; margin-right: 12px; }
.vue-flow__controls-button { background: var(--ui-bg); border-bottom-color: var(--ui-border); color: var(--ui-text); fill: currentColor; }
.vue-flow__controls-button:hover { background: var(--ui-bg-elevated); }
.vue-flow__minimap { border-radius: 14px; overflow: hidden; border: 1px solid var(--ui-border); background: var(--ui-bg); margin-right: 60px !important; margin-bottom: 12px !important; }
.vue-flow__node-zone { pointer-events: none !important; }
.vue-flow__node-zone .vue-flow__resize-control { pointer-events: all; }
.vue-flow__resize-control.handle { width: 10px; height: 10px; border-radius: 3px; }
</style>
