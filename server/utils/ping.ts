import { execFile } from 'node:child_process'

// Every address with a ping interval is probed on its own schedule. A tick
// runs every few seconds and pings whatever is due. Results live in memory
// only: after a restart the dots are grey until the first round.
const TICK = 5_000
const statuses = new Map<string, DeviceStatus & { id: number, value: string }>()
const inflight = new Set<string>()
const key = (id: number, value: string) => `${id}|${value}`

function pingOnce(host: string, wait: number): Promise<{ ok: boolean, rtt: number | null }> {
  const args = ['-c', '1', '-W', String(wait)]
  if (host.includes(':')) args.unshift('-6')
  args.push(host)
  return new Promise((resolve) => {
    execFile('ping', args, { timeout: (wait + 2) * 1000 }, (err, stdout) => {
      const m = /time[=<]([\d.]+)\s*ms/.exec(stdout ?? '')
      resolve({ ok: !err, rtt: m ? Number(m[1]) : null })
    })
  })
}

function targets() {
  const rows = useDb().prepare('SELECT id, addresses, ping_host FROM devices').all() as { id: number, addresses: string, ping_host: string }[]
  return rows.flatMap(r => upgradeAddresses(JSON.parse(r.addresses || '[]'), r.ping_host ?? '')
    .filter(a => (a.ping ?? 0) > 0 && a.value.trim())
    .map(a => ({ id: r.id, value: a.value.trim(), kind: a.kind, interval: Math.max(5, a.ping!) })))
}

async function probe(t: { id: number, value: string, kind: AddressKind }) {
  const k = key(t.id, t.value)
  inflight.add(k)
  try {
    // Overlay addresses get longer to answer than the LAN.
    const { ok, rtt } = await pingOnce(t.value, t.kind === 'yggdrasil' ? 5 : 2)
    statuses.set(k, { id: t.id, value: t.value, state: ok ? 'up' : 'down', rtt, checkedAt: Date.now() })
  }
  finally {
    inflight.delete(k)
  }
}

export async function pingTick() {
  const due = targets()
  const wanted = new Set(due.map(t => key(t.id, t.value)))
  for (const k of statuses.keys()) if (!wanted.has(k)) statuses.delete(k)
  const now = Date.now()
  await Promise.all(due
    .filter((t) => {
      const k = key(t.id, t.value)
      const last = statuses.get(k)?.checkedAt ?? 0
      return !inflight.has(k) && now - last >= t.interval * 1000 - TICK / 2
    })
    .map(probe))
}

export function startPinger() {
  const run = () => pingTick().catch(e => console.error('[ping]', e))
  run()
  setInterval(run, TICK).unref?.()
}

// After a device is saved its addresses are checked right away instead of
// waiting for their interval.
export function repingDevice(id: number) {
  for (const k of [...statuses.keys()]) if (k.startsWith(`${id}|`)) statuses.delete(k)
  pingTick().catch(() => {})
}

export function getStatuses(): StatusMap {
  const out: StatusMap = {}
  for (const s of statuses.values()) {
    (out[s.id] ??= {})[s.value] = { state: s.state, rtt: s.rtt, checkedAt: s.checkedAt }
  }
  return out
}
