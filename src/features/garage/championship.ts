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

// Contratos DEMO: el proveedor real de resultados podrá sustituir esta fuente sin cambiar la UI.
export const demoDriverStandings: DriverStanding[] = [
  { position: 1, driverId: 'demo-driver-01', driverName: 'PILOTO DEMO 01', teamId: 'mercedes', points: 0 },
  { position: 2, driverId: 'demo-driver-02', driverName: 'PILOTO DEMO 02', teamId: 'ferrari', points: 0 },
  { position: 3, driverId: 'demo-driver-03', driverName: 'PILOTO DEMO 03', teamId: 'mclaren', points: 0 },
]

export const demoConstructorStandings: ConstructorStanding[] = [
  { position: 1, teamId: 'mercedes', points: 0 },
  { position: 2, teamId: 'ferrari', points: 0 },
  { position: 3, teamId: 'mclaren', points: 0 },
  { position: 4, teamId: 'red-bull-racing', points: 0 },
]
