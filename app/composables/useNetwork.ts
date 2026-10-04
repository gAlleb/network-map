// One shared store for the page: the network as loaded from the API, ping
// statuses, and what is selected. useState keeps it single across components.

export type Selection =
  | { kind: 'device', id: number }
  | { kind: 'link', id: number }
  | { kind: 'zone', id: number }
  | null

export interface DeviceHealth {
  state: 'up' | 'partial' | 'down' | 'unknown' | 'off'
  rtt: number | null
  up: number
  total: number
}

export function useNetwork() {
  const zones = useState<Zone[]>('zones', () => [])
  const devices = useState<Device[]>('devices', () => [])
  const links = useState<Link[]>('links', () => [])
  const statuses = useState<StatusMap>('statuses', () => ({}))
  const selection = useState<Selection>('selection', () => null)
  const loaded = useState('loaded', () => false)

  const toast = useToast()
  const fail = (title: string) => (e: any) => {
    toast.add({ title, description: e?.data?.statusMessage ?? e?.message, color: 'error', icon: 'i-lucide-triangle-alert' })
    throw e
  }

  async function load() {
    const data = await $fetch<NetworkData>('/api/network')
    zones.value = data.zones
    devices.value = data.devices
    links.value = data.links
    loaded.value = true
  }

  async function refreshStatus() {
    try {
      statuses.value = await $fetch<StatusMap>('/api/status')
    }
    catch { /* the next poll will try again */ }
  }

  const deviceById = (id: number) => devices.value.find(d => d.id === id)
  const zoneById = (id: number | null) => (id == null ? undefined : zones.value.find(z => z.id === id))

  // One verdict per device from all of its pinged addresses: green when all
  // answer, amber when only some do, red when none do.
  function health(id: number): DeviceHealth {
    const d = deviceById(id)
    const pinged = (d?.addresses ?? []).filter(a => (a.ping ?? 0) > 0)
    if (!pinged.length) return { state: 'off', rtt: null, up: 0, total: 0 }
    const results = pinged.map(a => statuses.value[id]?.[a.value]).filter(Boolean) as DeviceStatus[]
    if (!results.length) return { state: 'unknown', rtt: null, up: 0, total: pinged.length }
    const up = results.filter(r => r.state === 'up')
    const rtts = up.map(r => r.rtt).filter((r): r is number => r != null)
    return {
      state: up.length === 0 ? 'down' : up.length === pinged.length ? 'up' : 'partial',
      rtt: rtts.length ? Math.min(...rtts) : null,
      up: up.length,
      total: pinged.length,
    }
  }
  const addressStatus = (id: number, a: Address) => ((a.ping ?? 0) > 0 ? statuses.value[id]?.[a.value] : undefined)

  // ── devices ───────────────────────────────────────────────────────────
  async function saveDevice(d: Partial<Device> & { id?: number }) {
    if (d.id) {
      const saved = await $fetch<Device>(`/api/devices/${d.id}`, { method: 'PUT', body: d }).catch(fail('Не удалось сохранить устройство'))
      devices.value = devices.value.map(x => (x.id === saved.id ? saved : x))
      return saved
    }
    const saved = await $fetch<Device>('/api/devices', { method: 'POST', body: d }).catch(fail('Не удалось добавить устройство'))
    devices.value = [...devices.value, saved]
    return saved
  }

  async function deleteDevice(id: number) {
    await $fetch(`/api/devices/${id}`, { method: 'DELETE' }).catch(fail('Не удалось удалить устройство'))
    devices.value = devices.value.filter(d => d.id !== id)
    links.value = links.value.filter(l => l.source !== id && l.target !== id)
    if (selection.value?.kind === 'device' && selection.value.id === id) selection.value = null
  }

  // ── links ─────────────────────────────────────────────────────────────
  async function saveLink(l: Partial<Link> & { id?: number }) {
    if (l.id) {
      const saved = await $fetch<Link>(`/api/links/${l.id}`, { method: 'PUT', body: l }).catch(fail('Не удалось сохранить связь'))
      links.value = links.value.map(x => (x.id === saved.id ? saved : x))
      return saved
    }
    const saved = await $fetch<Link>('/api/links', { method: 'POST', body: l }).catch(fail('Не удалось добавить связь'))
    links.value = [...links.value, saved]
    return saved
  }

  async function deleteLink(id: number) {
    await $fetch(`/api/links/${id}`, { method: 'DELETE' }).catch(fail('Не удалось удалить связь'))
    links.value = links.value.filter(l => l.id !== id)
    if (selection.value?.kind === 'link' && selection.value.id === id) selection.value = null
  }

  // ── zones ─────────────────────────────────────────────────────────────
  async function saveZone(z: Partial<Zone> & { id?: number }) {
    if (z.id) {
      const saved = await $fetch<Zone>(`/api/zones/${z.id}`, { method: 'PUT', body: z }).catch(fail('Не удалось сохранить зону'))
      zones.value = zones.value.map(x => (x.id === saved.id ? saved : x))
      return saved
    }
    const saved = await $fetch<Zone>('/api/zones', { method: 'POST', body: z }).catch(fail('Не удалось добавить зону'))
    zones.value = [...zones.value, saved]
    return saved
  }

  async function deleteZone(id: number) {
    await $fetch(`/api/zones/${id}`, { method: 'DELETE' }).catch(fail('Не удалось удалить зону'))
    zones.value = zones.value.filter(z => z.id !== id)
    devices.value = devices.value.map(d => (d.zoneId === id ? { ...d, zoneId: null } : d))
    if (selection.value?.kind === 'zone' && selection.value.id === id) selection.value = null
  }

  // ── positions ─────────────────────────────────────────────────────────
  // Drags arrive in bursts; they are merged and written once things settle.
  const pending = { devices: new Map<number, any>(), zones: new Map<number, any>() }
  let timer: ReturnType<typeof setTimeout> | undefined

  function queuePositions(p: { devices?: { id: number, x: number, y: number, zoneId?: number | null }[], zones?: { id: number, x: number, y: number, width?: number, height?: number }[] }) {
    for (const d of p.devices ?? []) {
      pending.devices.set(d.id, { ...pending.devices.get(d.id), ...d })
      devices.value = devices.value.map(x => (x.id === d.id ? { ...x, x: d.x, y: d.y, ...(d.zoneId !== undefined ? { zoneId: d.zoneId } : {}) } : x))
    }
    for (const z of p.zones ?? []) {
      pending.zones.set(z.id, { ...pending.zones.get(z.id), ...z })
      zones.value = zones.value.map(x => (x.id === z.id ? { ...x, ...z } : x))
    }
    clearTimeout(timer)
    timer = setTimeout(flushPositions, 400)
  }

  async function flushPositions() {
    const body = { devices: [...pending.devices.values()], zones: [...pending.zones.values()] }
    pending.devices.clear()
    pending.zones.clear()
    if (!body.devices.length && !body.zones.length) return
    await $fetch('/api/positions', { method: 'PUT', body }).catch(fail('Не удалось сохранить расположение'))
  }

  return {
    zones, devices, links, statuses, selection, loaded,
    load, refreshStatus, deviceById, zoneById, health, addressStatus,
    saveDevice, deleteDevice, saveLink, deleteLink, saveZone, deleteZone,
    queuePositions,
  }
}
