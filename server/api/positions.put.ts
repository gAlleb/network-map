// Dragging on the map only moves things; this saves positions (and the zone a
// device was dropped into) without rewriting whole rows.
interface Body {
  devices?: { id: number, x: number, y: number, zoneId?: number | null }[]
  zones?: { id: number, x: number, y: number, width?: number, height?: number }[]
}

export default defineEventHandler(async (event) => {
  const b = await readBody<Body>(event)
  const db = useDb()
  const dev = db.prepare('UPDATE devices SET x = ?, y = ? WHERE id = ?')
  const devZone = db.prepare('UPDATE devices SET x = ?, y = ?, zone_id = ? WHERE id = ?')
  const zone = db.prepare('UPDATE zones SET x = ?, y = ?, width = coalesce(?, width), height = coalesce(?, height) WHERE id = ?')
  db.exec('BEGIN')
  try {
    for (const d of b.devices ?? []) {
      if (d.zoneId === undefined) dev.run(d.x, d.y, d.id)
      else devZone.run(d.x, d.y, d.zoneId, d.id)
    }
    for (const z of b.zones ?? []) zone.run(z.x, z.y, z.width ?? null, z.height ?? null, z.id)
    db.exec('COMMIT')
  }
  catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return { ok: true }
})
