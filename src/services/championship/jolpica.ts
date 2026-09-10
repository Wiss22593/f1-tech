import type { ChampionshipProvider, ConstructorStanding, DriverStanding } from './types'

export interface ChampionshipSnapshot { schemaVersion: 'championship-standings-v1'; source: string; sourceUrl: string; license: string; season: number; round: number; retrievedAt: string; stale: boolean; drivers: DriverStanding[]; constructors: ConstructorStanding[] }

let retained: ChampionshipSnapshot | null = null

export class PublishedChampionshipProvider implements ChampionshipProvider<DriverStanding, ConstructorStanding> {
  async getSnapshot(season: number): Promise<ChampionshipSnapshot> {
    try {
      const response = await fetch(`/data/championship/${season}.json`, { cache: 'no-cache' })
      if (!response.ok) throw new Error(`championship_dataset_${response.status}`)
      const snapshot = await response.json() as ChampionshipSnapshot
      if (snapshot.schemaVersion !== 'championship-standings-v1' || snapshot.season !== season || !snapshot.drivers?.length || !snapshot.constructors?.length) throw new Error('invalid_championship_dataset')
      retained = snapshot
      return snapshot
    } catch (cause) {
      if (retained?.season === season) return { ...retained, stale: true }
      throw cause
    }
  }
  async getDriverStandings(season: number) { return (await this.getSnapshot(season)).drivers }
  async getConstructorStandings(season: number) { return (await this.getSnapshot(season)).constructors }
}
