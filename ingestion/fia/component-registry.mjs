/**
 * Deliberate FIA table terminology -> stable F1 TECH component IDs.
 * This registry is the only automatic mapping boundary. Suggestions are never
 * used for publication and exist solely to make manual review actionable.
 */
export const componentMappings = [
  { componentId: 'front-wing', aliases: ['front wing'] },
  { componentId: 'nose', aliases: ['nose'] },
  { componentId: 'floor', aliases: ['floor'] },
  { componentId: 'diffuser', aliases: ['diffuser'] },
  { componentId: 'rear-wing', aliases: ['rear wing'] },
  { componentId: 'sidepods', aliases: ['sidepod'] },
  { componentId: 'cooling', aliases: ['cooling'] },
  { componentId: 'engine-cover', aliases: ['engine cover'] },
  { componentId: 'airbox', aliases: ['airbox'] },
  { componentId: 'cockpit', aliases: ['cockpit'] },
  { componentId: 'halo', aliases: ['halo'] },
  { componentId: 'front-suspension', aliases: ['front suspension'] },
  { componentId: 'rear-suspension', aliases: ['rear suspension'] },
  { componentId: 'brakes', aliases: ['brake'] },
  { componentId: 'wheels-tyres', aliases: ['wheel', 'tyre', 'tire'] },
]

const normalize = (value = '') => value.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ')

export function mapFiaComponent(value = '') {
  const normalized = normalize(value)
  return componentMappings.find(({ componentId }) => normalized === componentId)?.componentId
    ?? componentMappings.find(({ aliases }) => aliases.some((alias) => normalized.includes(alias)))?.componentId
    ?? null
}

/** Conservative token-overlap hints; never an automatic mapping. */
export function suggestFiaComponents(value = '') {
  const tokens = new Set(normalize(value).split(' ').filter((token) => token.length > 2))
  return componentMappings.filter(({ aliases }) => aliases.some((alias) => normalize(alias).split(' ').some((token) => tokens.has(token))))
    .map(({ componentId }) => componentId)
}
