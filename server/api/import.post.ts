// Restores a backup made by GET /api/export: the whole map is replaced.
export default defineEventHandler(async (event) => {
  const counts = importNetwork(useDb(), await readBody(event))
  pingTick().catch(() => {})
  return counts
})
