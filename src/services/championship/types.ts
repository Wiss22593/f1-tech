export interface DriverStanding {
  position: number
  driverId: string
  driverName: string
  teamId: string
  points: number
}

export interface ConstructorStanding {
  position: number
  teamId: string
  points: number
}

export interface ChampionshipProvider<TDriver, TConstructor> {
  getDriverStandings(season: number): Promise<readonly TDriver[]>
  getConstructorStandings(season: number): Promise<readonly TConstructor[]>
}
