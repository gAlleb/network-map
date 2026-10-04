export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const p = zoneParams(await readBody(event))
  useDb().prepare(`UPDATE zones SET name = :name, kind = :kind, subnet = :subnet, color = :color, description = :description,
    x = :x, y = :y, width = :width, height = :height WHERE id = :id`).run({ ...p, id })
  return toZone(useDb().prepare('SELECT * FROM zones WHERE id = ?').get(id) as any)
})
