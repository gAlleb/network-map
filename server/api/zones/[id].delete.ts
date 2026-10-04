export default defineEventHandler((event) => {
  useDb().prepare('DELETE FROM zones WHERE id = ?').run(idParam(event))
  return { ok: true }
})
