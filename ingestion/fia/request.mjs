/** Public official sources only. Access denials are never retried. */
export async function officialRequest(url, options = {}, { fetchFn = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 3, log = message => console.error(message) } = {}) {
  const official = value => { const u = new URL(value); return u.protocol === 'https:' && ['fia.com','www.fia.com','www.formula1.com'].includes(u.hostname) }
  if (!official(url)) throw new Error('Non-official request URL: ' + url)
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response
    try { response = await fetchFn(url, { ...options, signal: AbortSignal.timeout(Number(process.env.FIA_FETCH_TIMEOUT_MS ?? 25000)) }) }
    catch (error) {
      if (attempt === attempts) throw error
      log('OFFICIAL_RETRY network attempt=' + attempt + ' url=' + url)
      await sleep(500 * 2 ** (attempt - 1)); continue
    }
    if (!official(response.url || url)) throw new Error('Non-official response redirect: ' + (response.url || url))
    if (![429,500,502,503,504].includes(response.status) || attempt === attempts) return response
    const retryAfter = response.headers.get('retry-after'), seconds = Number(retryAfter)
    const requestedWait = retryAfter ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now()) : null
    if (requestedWait > 10000) { log('OFFICIAL_RETRY_DEFERRED retry-after exceeds this run budget url=' + url); return response }
    const wait = Number.isFinite(requestedWait) && requestedWait !== null ? requestedWait : 500 * 2 ** (attempt - 1)
    log('OFFICIAL_RETRY status=' + response.status + ' attempt=' + attempt + ' url=' + url)
    await response.body?.cancel()
    await sleep(Math.min(10000, Math.max(500, wait)))
  }
}
