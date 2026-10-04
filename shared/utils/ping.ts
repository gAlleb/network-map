// Ping intervals offered in the UI, in seconds. 0 turns pinging off.
export const pingIntervals = [0, 10, 20, 60, 120, 300, 900] as const

// What a freshly added address gets. Yggdrasil answers in hundreds of
// milliseconds and every probe walks the overlay, so it is asked less often.
export function defaultPingInterval(kind: AddressKind): number {
  if (kind === 'yggdrasil') return 120
  if (kind === 'mac' || kind === 'dns' || kind === 'other' || kind === 'netbird6' || kind === 'public6') return 0
  return 20
}

export function pingIntervalLabel(s: number | undefined): string {
  if (!s) return 'не пинговать'
  return s < 60 ? `каждые ${s} с` : `каждые ${s / 60} мин`
}

// Rows written before per-address pinging had a single ping_host column.
// They get the same behaviour expressed the new way: that address on the
// default interval, and Yggdrasil addresses on theirs.
export function upgradeAddresses(addresses: Address[], pingHost: string): Address[] {
  if (addresses.some(a => a.ping !== undefined)) return addresses
  return addresses.map((a) => {
    const v = a.value.trim()
    if (v && v === pingHost.trim()) return { ...a, ping: a.kind === 'yggdrasil' ? 120 : 20 }
    if (a.kind === 'yggdrasil') return { ...a, ping: 120 }
    return { ...a, ping: 0 }
  })
}
