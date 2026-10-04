export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const p = deviceParams(await readBody(event))
  useDb().prepare(`UPDATE devices SET name = :name, type = :type, zone_id = :zone_id, description = :description,
    os = :os, addresses = :addresses, services = :services, notes = :notes, ping_host = :ping_host, x = :x, y = :y
    WHERE id = :id`).run({ ...p, id })
  repingDevice(id)
  return toDevice(useDb().prepare('SELECT * FROM devices WHERE id = ?').get(id) as any)
})
