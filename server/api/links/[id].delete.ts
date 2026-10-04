export default defineEventHandler((event) => {
  useDb().prepare('DELETE FROM links WHERE id = ?').run(idParam(event))
  return { ok: true }
})
