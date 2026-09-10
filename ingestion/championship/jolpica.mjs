const teamIds = { mercedes: 'mercedes', ferrari: 'ferrari', mclaren: 'mclaren', red_bull: 'red-bull-racing', rb: 'racing-bulls', alpine: 'alpine', haas: 'haas', audi: 'audi', williams: 'williams', aston_martin: 'aston-martin', cadillac: 'cadillac' }

const request = async (fetchFn, url) => {
  const response = await fetchFn(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(Number(process.env.CHAMPIONSHIP_FETCH_TIMEOUT_MS ?? 30000)) })
  if (!response.ok) throw new Error(`championship_request_${response.status}`)
  return response.json()
}

const finiteNumber = (value, field) => { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`invalid_${field}`); return parsed }
const stableTeam = (value) => { const mapped = teamIds[value]; if (!mapped) throw new Error(`unmapped_constructor_${value}`); return mapped }

export class JolpicaChampionshipProvider {
  constructor({ fetchFn = fetch, fallback = null } = {}) { this.fetchFn = fetchFn; this.fallback = fallback }

  async getSnapshot(season) {
    try {
      const base = `https://api.jolpi.ca/ergast/f1/${season}`
      const [driverPayload, constructorPayload] = await Promise.all([request(this.fetchFn, `${base}/driverStandings/`), request(this.fetchFn, `${base}/constructorStandings/`)])
      const driverList = driverPayload?.MRData?.StandingsTable?.StandingsLists?.[0]
      const constructorList = constructorPayload?.MRData?.StandingsTable?.StandingsLists?.[0]
      if (Number(driverList?.season) !== season || Number(constructorList?.season) !== season) throw new Error('invalid_standings_season')
      const drivers = driverList.DriverStandings.map((entry) => ({ position: finiteNumber(entry.position, 'position'), driverId: entry.Driver.driverId, driverName: `${entry.Driver.givenName} ${entry.Driver.familyName}`.trim(), teamId: stableTeam(entry.Constructors[0]?.constructorId), points: finiteNumber(entry.points, 'points') }))
      const constructors = constructorList.ConstructorStandings.map((entry) => ({ position: finiteNumber(entry.position, 'position'), teamId: stableTeam(entry.Constructor.constructorId), points: finiteNumber(entry.points, 'points') }))
      if (!drivers.length || !constructors.length || new Set(drivers.map(({ position }) => position)).size !== drivers.length || new Set(constructors.map(({ teamId }) => teamId)).size !== constructors.length) throw new Error('invalid_standings_dataset')
      return { schemaVersion: 'championship-standings-v1', source: 'Jolpica F1 API', sourceUrl: base, license: 'CC BY-NC-SA 4.0', season, round: Number(driverList.round), retrievedAt: new Date().toISOString(), stale: false, drivers, constructors }
    } catch (error) {
      if (this.fallback?.season === season && this.fallback.drivers?.length && this.fallback.constructors?.length) return { ...this.fallback, stale: true, fallbackReason: error instanceof Error ? error.message : 'championship_error' }
      throw error
    }
  }

  async getDriverStandings(season) { return (await this.getSnapshot(season)).drivers }
  async getConstructorStandings(season) { return (await this.getSnapshot(season)).constructors }
}
