export default defineEventHandler(async (event) => {
  const id = idParam(event)
  const p = linkParams(await readBody(event))
  useDb().prepare('UPDATE links SET source = :source, target = :target, kind = :kind, label = :label, notes = :notes WHERE id = :id').run({ ...p, id })
  return toLink(useDb().prepare('SELECT * FROM links WHERE id = ?').get(id) as any)
})
