import type { DatabaseSync } from 'node:sqlite'

// Replaces the whole map with a file in the format of GET /api/export. The
// same path fills an empty database with the demo network, so the backup
// format is exercised on every fresh install. Ids are kept, so links and zone
// membership come back exactly as they were.
export function importNetwork(db: DatabaseSync, data: Partial<NetworkData>) {
  const zones = Array.isArray(data?.zones) ? data.zones : null
  const devices = Array.isArray(data?.devices) ? data.devices : null
  const links = Array.isArray(data?.links) ? data.links : null
  if (!zones || !devices || !links) {
    throw createError({ statusCode: 400, statusMessage: 'ожидается JSON из «Скачать JSON»: zones, devices, links' })
  }
  const zoneIds = new Set(zones.map(z => Number(z.id)))
  const deviceIds = new Set(devices.map(d => Number(d.id)))

  const insZone = db.prepare(`INSERT INTO zones (id, name, kind, subnet, color, description, x, y, width, height)
    VALUES (:id, :name, :kind, :subnet, :color, :description, :x, :y, :width, :height)`)
  const insDevice = db.prepare(`INSERT INTO devices (id, name, type, zone_id, description, os, addresses, services, notes, ping_host, x, y)
    VALUES (:id, :name, :type, :zone_id, :description, :os, :addresses, :services, :notes, :ping_host, :x, :y)`)
  const insLink = db.prepare(`INSERT INTO links (id, source, target, kind, label, notes)
    VALUES (:id, :source, :target, :kind, :label, :notes)`)

  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM links; DELETE FROM devices; DELETE FROM zones;')
    for (const z of zones) insZone.run({ id: Number(z.id), ...zoneParams(z) })
    for (const d of devices) {
      const zoneId = zoneIds.has(Number(d.zoneId)) ? Number(d.zoneId) : null
      insDevice.run({ id: Number(d.id), ...deviceParams({ ...d, zoneId }) })
    }
    for (const l of links) {
      if (!deviceIds.has(Number(l.source)) || !deviceIds.has(Number(l.target))) continue
      insLink.run({ id: Number(l.id), ...linkParams(l) })
    }
    db.exec('COMMIT')
  }
  catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return { zones: zones.length, devices: devices.length, links: links.length }
}
