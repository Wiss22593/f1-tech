export const championshipSources = {
  disabled: { commercialUse: false, productionEligible: false, credentialsRequired: false },
  'jolpica-development': { commercialUse: false, productionEligible: false, credentialsRequired: false },
  sportmonks: { commercialUse: true, productionEligible: true, credentialsRequired: true },
}

/** Prevents a non-commercial or unlicensed feed from becoming a production default. */
export function resolveChampionshipSource(env = process.env) {
  const source = env.CHAMPIONSHIP_SOURCE ?? 'disabled'
  const definition = championshipSources[source]
  if (!definition) throw new Error(`unknown_championship_source:${source}`)
  if (source === 'disabled') throw new Error('CHAMPIONSHIP_SOURCE_USER_DECISION_REQUIRED')
  if (source === 'jolpica-development' && env.ALLOW_NONCOMMERCIAL_CHAMPIONSHIP !== 'true') throw new Error('NONCOMMERCIAL_CHAMPIONSHIP_SOURCE_BLOCKED')
  if (source === 'sportmonks' && !env.SPORTMONKS_API_TOKEN) throw new Error('SPORTMONKS_CREDENTIALS_REQUIRED')
  return { source, ...definition }
}
