export default defineEventHandler((event) => {
  useDb().prepare('DELETE FROM devices WHERE id = ?').run(idParam(event))
  return { ok: true }
})
