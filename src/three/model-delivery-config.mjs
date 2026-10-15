/** Local rollout switch. Originals remain available through ?modelMode=original. */
export const optimizedModelDeliveryEnabled = true

/** The explicit optimized query is also the isolated validation entry point. */
export function shouldUseOptimizedModels(search = typeof window === 'undefined' ? '' : window.location.search) {
  const mode = new URLSearchParams(search).get('modelMode')
  if (mode === 'original') return false
  if (mode === 'optimized') return true
  return optimizedModelDeliveryEnabled
}

