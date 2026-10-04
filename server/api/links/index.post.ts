export default defineEventHandler(async (event) => {
  const p = linkParams(await readBody(event))
  if (!p.source || !p.target || p.source === p.target)
    throw createError({ statusCode: 400, statusMessage: 'link needs two different devices' })
  const r = useDb().prepare('INSERT INTO links (source, target, kind, label, notes) VALUES (:source, :target, :kind, :label, :notes)').run(p)
  return toLink(useDb().prepare('SELECT * FROM links WHERE id = ?').get(Number(r.lastInsertRowid)) as any)
})
