export type DevelopmentStatus = 'En desarrollo' | 'Validación en curso' | 'Preparación técnica'

export interface Team {
  id: string
  name: string
  season: 2026
  carName: string | null
  demoUpdates: number
  demoScore: number
  demoDevelopmentStatus: DevelopmentStatus
}

export const teams: Team[] = [
  { id: 'mercedes', name: 'Mercedes', season: 2026, carName: null, demoUpdates: 4, demoScore: 86, demoDevelopmentStatus: 'Validación en curso' },
  { id: 'ferrari', name: 'Ferrari', season: 2026, carName: null, demoUpdates: 3, demoScore: 83, demoDevelopmentStatus: 'En desarrollo' },
  { id: 'mclaren', name: 'McLaren', season: 2026, carName: null, demoUpdates: 5, demoScore: 89, demoDevelopmentStatus: 'Preparación técnica' },
  { id: 'red-bull-racing', name: 'Red Bull Racing', season: 2026, carName: null, demoUpdates: 4, demoScore: 85, demoDevelopmentStatus: 'Validación en curso' },
  { id: 'racing-bulls', name: 'Racing Bulls', season: 2026, carName: null, demoUpdates: 2, demoScore: 71, demoDevelopmentStatus: 'En desarrollo' },
  { id: 'aston-martin', name: 'Aston Martin', season: 2026, carName: null, demoUpdates: 3, demoScore: 78, demoDevelopmentStatus: 'Preparación técnica' },
  { id: 'alpine', name: 'Alpine', season: 2026, carName: null, demoUpdates: 2, demoScore: 69, demoDevelopmentStatus: 'En desarrollo' },
  { id: 'haas', name: 'Haas', season: 2026, carName: null, demoUpdates: 1, demoScore: 64, demoDevelopmentStatus: 'Preparación técnica' },
  { id: 'audi', name: 'Audi', season: 2026, carName: null, demoUpdates: 3, demoScore: 75, demoDevelopmentStatus: 'Validación en curso' },
  { id: 'williams', name: 'Williams', season: 2026, carName: null, demoUpdates: 2, demoScore: 72, demoDevelopmentStatus: 'En desarrollo' },
  { id: 'cadillac', name: 'Cadillac', season: 2026, carName: null, demoUpdates: 1, demoScore: 67, demoDevelopmentStatus: 'Preparación técnica' },
]
