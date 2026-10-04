export default defineEventHandler(async (event) => {
  const p = deviceParams(await readBody(event))
  const r = useDb().prepare(`INSERT INTO devices (name, type, zone_id, description, os, addresses, services, notes, ping_host, x, y)
    VALUES (:name, :type, :zone_id, :description, :os, :addresses, :services, :notes, :ping_host, :x, :y)`).run(p)
  const id = Number(r.lastInsertRowid)
  repingDevice(id)
  return toDevice(useDb().prepare('SELECT * FROM devices WHERE id = ?').get(id) as any)
})
