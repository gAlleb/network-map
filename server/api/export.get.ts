export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="network-map-${new Date().toISOString().slice(0, 10)}.json"`)
  return readNetwork()
})
