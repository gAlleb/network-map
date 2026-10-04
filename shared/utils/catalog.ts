// Labels (English and Russian) and colours for everything the map can show. Colours are plain hex
// because they end up in SVG strokes and inline styles, where Tailwind's
// class scanner cannot see them.

export const deviceTypes: Record<DeviceType, { label: Label, icon: string }> = {
  router: { label: { en: 'Router', ru: 'Роутер' }, icon: 'i-lucide-router' },
  hypervisor: { label: { en: 'Hypervisor', ru: 'Гипервизор' }, icon: 'i-lucide-server-cog' },
  server: { label: { en: 'Server', ru: 'Сервер' }, icon: 'i-lucide-server' },
  vm: { label: { en: 'Virtual machine', ru: 'Виртуальная машина' }, icon: 'i-lucide-box' },
  nas: { label: { en: 'Storage', ru: 'Хранилище' }, icon: 'i-lucide-hard-drive' },
  vps: { label: { en: 'VPS', ru: 'VPS' }, icon: 'i-lucide-cloud' },
  laptop: { label: { en: 'Laptop', ru: 'Ноутбук' }, icon: 'i-lucide-laptop' },
  desktop: { label: { en: 'Desktop', ru: 'Компьютер' }, icon: 'i-lucide-monitor' },
  phone: { label: { en: 'Phone', ru: 'Телефон' }, icon: 'i-lucide-smartphone' },
  printer: { label: { en: 'Printer', ru: 'Принтер' }, icon: 'i-lucide-printer' },
  tv: { label: { en: 'TV', ru: 'Телевизор' }, icon: 'i-lucide-tv' },
  console: { label: { en: 'Console', ru: 'Приставка' }, icon: 'i-lucide-gamepad-2' },
  switch: { label: { en: 'Switch', ru: 'Коммутатор' }, icon: 'i-lucide-network' },
  ap: { label: { en: 'Access point', ru: 'Точка доступа' }, icon: 'i-lucide-wifi' },
  camera: { label: { en: 'Camera', ru: 'Камера' }, icon: 'i-lucide-cctv' },
  mesh: { label: { en: 'Overlay network', ru: 'Оверлейная сеть' }, icon: 'i-lucide-waypoints' },
  internet: { label: { en: 'Internet', ru: 'Интернет' }, icon: 'i-lucide-globe' },
  other: { label: { en: 'Other', ru: 'Другое' }, icon: 'i-lucide-circle-help' },
}

export const typeColors: Record<DeviceType, string> = {
  router: '#10b981', hypervisor: '#f97316', server: '#64748b', vm: '#0ea5e9', nas: '#3b82f6',
  vps: '#f59e0b', laptop: '#8b5cf6', desktop: '#6366f1', phone: '#ec4899', printer: '#14b8a6',
  tv: '#0ea5e9', console: '#6366f1', switch: '#10b981', ap: '#22c55e', camera: '#64748b',
  mesh: '#f97316', internet: '#3b82f6', other: '#a1a1aa',
}

export const addressKinds: Record<AddressKind, { label: Label, short: string, color: string }> = {
  lan: { label: { en: 'LAN IP', ru: 'Локальный IP' }, short: 'LAN', color: '#10b981' },
  netbird: { label: { en: 'NetBird IP', ru: 'NetBird IP' }, short: 'NB', color: '#f97316' },
  netbird6: { label: { en: 'NetBird IPv6', ru: 'NetBird IPv6' }, short: 'NB6', color: '#fb923c' },
  yggdrasil: { label: { en: 'Yggdrasil', ru: 'Yggdrasil' }, short: 'YGG', color: '#a855f7' },
  wireguard: { label: { en: 'WireGuard', ru: 'WireGuard' }, short: 'WG', color: '#ef4444' },
  public: { label: { en: 'Public IPv4', ru: 'Публичный IPv4' }, short: 'WAN', color: '#3b82f6' },
  public6: { label: { en: 'Public IPv6', ru: 'Публичный IPv6' }, short: 'WAN6', color: '#60a5fa' },
  dns: { label: { en: 'Name', ru: 'Имя' }, short: 'DNS', color: '#14b8a6' },
  mac: { label: { en: 'MAC', ru: 'MAC' }, short: 'MAC', color: '#71717a' },
  other: { label: { en: 'Other', ru: 'Другое' }, short: '•', color: '#a1a1aa' },
}

export const linkKinds: Record<LinkKind, { label: Label, color: string, dash?: string, animated?: boolean, width?: number }> = {
  lan: { label: { en: 'Cable (LAN)', ru: 'Кабель (LAN)' }, color: '#71717a', width: 1.5 },
  wifi: { label: { en: 'Wi-Fi', ru: 'Wi-Fi' }, color: '#22c55e', dash: '2 5', width: 1.5 },
  wireguard: { label: { en: 'WireGuard', ru: 'WireGuard' }, color: '#ef4444', dash: '8 5', animated: true, width: 2.5 },
  netbird: { label: { en: 'NetBird', ru: 'NetBird' }, color: '#f97316', dash: '6 4', animated: true, width: 2 },
  yggdrasil: { label: { en: 'Yggdrasil', ru: 'Yggdrasil' }, color: '#a855f7', dash: '6 4', animated: true, width: 2 },
  amnezia: { label: { en: 'AmneziaWG', ru: 'AmneziaWG' }, color: '#eab308', dash: '8 5', animated: true, width: 2 },
  internet: { label: { en: 'Internet', ru: 'Интернет' }, color: '#3b82f6', width: 2 },
  hosted: { label: { en: 'Hosted on', ru: 'Размещена на' }, color: '#0ea5e9', dash: '1 4', width: 2 },
  ssh: { label: { en: 'SSH', ru: 'SSH' }, color: '#14b8a6', dash: '4 4', width: 1.5 },
  other: { label: { en: 'Other', ru: 'Другое' }, color: '#a1a1aa', dash: '3 3', width: 1.5 },
}

export const zoneKinds: Record<ZoneKind, { label: Label, icon: string }> = {
  home: { label: { en: 'Home', ru: 'Дом' }, icon: 'i-lucide-house' },
  office: { label: { en: 'Office', ru: 'Офис' }, icon: 'i-lucide-building-2' },
  cloud: { label: { en: 'Cloud', ru: 'Облако' }, icon: 'i-lucide-cloud' },
  mobile: { label: { en: 'On the road', ru: 'В дороге' }, icon: 'i-lucide-plane' },
  overlay: { label: { en: 'Overlay', ru: 'Оверлей' }, icon: 'i-lucide-waypoints' },
  other: { label: { en: 'Other', ru: 'Другое' }, icon: 'i-lucide-square-dashed' },
}

export const zoneColors: Record<string, string> = {
  emerald: '#10b981',
  sky: '#0ea5e9',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6',
  indigo: '#6366f1',
  zinc: '#71717a',
}

export const zoneColor = (name: string) => zoneColors[name] ?? name ?? zoneColors.zinc

export const toItems = <T extends string>(rec: Record<T, { label: Label }>, lang: Lang) =>
  (Object.keys(rec) as T[]).map(value => ({ value, label: rec[value].label[lang] }))

// Address shown under a device name: the one it is reached by first.
const primaryOrder: AddressKind[] = ['lan', 'netbird', 'public', 'yggdrasil', 'dns', 'wireguard', 'public6', 'netbird6']
export function primaryAddress(d: Device): Address | undefined {
  for (const k of primaryOrder) {
    const a = d.addresses.find(a => a.kind === k)
    if (a) return a
  }
  return d.addresses[0]
}

// Device colour; overlay nodes take the colour of the network they stand for.
export function meshAccent(d?: Device): string | undefined {
  if (!d) return undefined
  if (d.type !== 'mesh') return typeColors[d.type]
  const n = d.name.toLowerCase()
  if (n.includes('ygg')) return linkKinds.yggdrasil.color
  if (n.includes('amnezia')) return linkKinds.amnezia.color
  if (n.includes('wireguard') || n.includes('wg')) return linkKinds.wireguard.color
  return linkKinds.netbird.color
}

export const fmtRtt = (rtt: number | null | undefined, lang: Lang) => {
  const ms = lang === 'ru' ? 'мс' : 'ms'
  return rtt == null ? '' : rtt < 1 ? `<1 ${ms}` : `${Math.round(rtt)} ${ms}`
}

export const shortUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')

// A service is a web service when it has an address to open in a browser.
// Everything else (dnsproxy, nebula-sync, SSH…) is listed on its machine as
// something that "also runs there".
const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u.trim())
export const isWebService = (s: Service) => isHttp(s.url) || isHttp(s.localUrl) || isHttp(s.publicUrl)
