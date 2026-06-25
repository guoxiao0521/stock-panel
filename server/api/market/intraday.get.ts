/** GET /api/market/intraday — 主要指数（道指/纳指/标普）当日盘中走势 */
export default defineEventHandler(async () => {
  return { series: await getIntradaySeriesList() }
})
