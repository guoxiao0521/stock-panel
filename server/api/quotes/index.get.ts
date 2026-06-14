/** GET /api/quotes?symbols=AAPL,MSFT — 按 symbols 查询缓存行情 */
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const raw = typeof query.symbols === 'string' ? query.symbols : ''
  const symbols = raw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)

  return {
    snapshots: getQuoteSnapshots(symbols),
  }
})
