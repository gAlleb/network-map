export default defineEventHandler(async (event) => {
  const p = zoneParams(await readBody(event))
  const r = useDb().prepare(`INSERT INTO zones (name, kind, subnet, color, description, x, y, width, height)
    VALUES (:name, :kind, :subnet, :color, :description, :x, :y, :width, :height)`).run(p)
  return toZone(useDb().prepare('SELECT * FROM zones WHERE id = ?').get(Number(r.lastInsertRowid)) as any)
})
