// Shared between the Nitro API and the Vue app (Nuxt auto-imports shared/types).

// Interface language. English is the default, Russian is the other choice.
export type Lang = 'en' | 'ru'
export type Label = Record<Lang, string>

export type ZoneKind = 'home' | 'office' | 'cloud' | 'mobile' | 'overlay' | 'other'

export type DeviceType =
  | 'router' | 'server' | 'hypervisor' | 'vm' | 'nas' | 'vps'
  | 'laptop' | 'desktop' | 'phone' | 'printer' | 'tv' | 'console'
  | 'switch' | 'ap' | 'camera' | 'mesh' | 'internet' | 'other'

export type AddressKind =
  | 'lan' | 'netbird' | 'netbird6' | 'yggdrasil' | 'wireguard'
  | 'public' | 'public6' | 'dns' | 'mac' | 'other'

export type LinkKind =
  | 'lan' | 'wifi' | 'wireguard' | 'netbird' | 'yggdrasil'
  | 'amnezia' | 'internet' | 'hosted' | 'ssh' | 'other'

export interface Address {
  kind: AddressKind
  value: string
  label?: string
  // Ping interval in seconds; 0 or absent means the address is not pinged.
  ping?: number
}

export interface Service {
  name: string
  // By IP inside the network, e.g. http://192.168.10.20:81
  url?: string
  // By a local name with a real certificate that only resolves inside
  // (local DNS), e.g. https://proxy.home.example
  localUrl?: string
  // Reachable from the internet, e.g. https://cloud.example.com
  publicUrl?: string
  note?: string
}

export interface Zone {
  id: number
  name: string
  kind: ZoneKind
  subnet: string
  color: string
  description: string
  x: number
  y: number
  width: number
  height: number
}

export interface Device {
  id: number
  name: string
  type: DeviceType
  zoneId: number | null
  description: string
  os: string
  addresses: Address[]
  services: Service[]
  notes: string
  x: number
  y: number
}

export interface Link {
  id: number
  source: number
  target: number
  kind: LinkKind
  label: string
  notes: string
}

export interface NetworkData {
  zones: Zone[]
  devices: Device[]
  links: Link[]
}

export type PingState = 'up' | 'down' | 'unknown'

// Per device id, per address value.
export type StatusMap = Record<number, Record<string, DeviceStatus>>

export interface DeviceStatus {
  state: PingState
  rtt: number | null
  checkedAt: number
}
