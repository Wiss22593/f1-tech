import { type F1TechCarAsset } from '../../three/assets'
import { teamModelManifest } from '../../three/model-manifest.mjs'

export interface ShowroomDriver { id: string; name: string; shortName: string; role: 'primary' | 'reserve' | null; number: number | null; airboxColor?: 'black' | 'yellow' | null; modelPath: F1TechCarAsset['path'] }
export interface ShowroomTeam { carName: string; drivers: ShowroomDriver[] }
// Racing numbers: user-provided 2026 roster. Preserve existing driver/variant order.
// Central team/driver -> GLB catalog; original drivers retain the manifest defaults.
// File discovery checks availability without importing or preloading model bytes.
export const showroomTeams: Record<string, ShowroomTeam> = {
  'mercedes': { carName: 'W17', drivers: [
    { id: 'antonelli', name: 'Kimi Antonelli', shortName: 'Antonelli', role: null, number: 12, modelPath: teamModelManifest['mercedes'].path },
    { id: 'russell', name: 'George Russell', shortName: 'Russell', role: null, number: 63, modelPath: '/models/mercedes-w17-russell.glb' },
  ] },
  'ferrari': { carName: 'SF26', drivers: [
    { id: 'leclerc', name: 'Charles Leclerc', shortName: 'Leclerc', role: null, number: 16, modelPath: teamModelManifest['ferrari'].path },
    { id: 'hamilton', name: 'Lewis Hamilton', shortName: 'Hamilton', role: null, number: 44, modelPath: '/models/ferrari-sf26-hamilton.glb' },
  ] },
  'mclaren': { carName: 'MCL40', drivers: [
    { id: 'norris', name: 'Lando Norris', shortName: 'Norris', role: null, number: 1, modelPath: teamModelManifest['mclaren'].path },
    { id: 'piastri', name: 'Oscar Piastri', shortName: 'Piastri', role: null, number: 81, modelPath: '/models/mclaren-mcl40-piastri.glb' },
  ] },
  'red-bull-racing': { carName: 'RB22', drivers: [
    { id: 'verstappen', name: 'Max Verstappen', shortName: 'Verstappen', role: null, number: 3, modelPath: teamModelManifest['red-bull-racing'].path },
    { id: 'hadjar', name: 'Isack Hadjar', shortName: 'Hadjar', role: null, number: 6, modelPath: '/models/red-bull-rb22-hadjar.glb' },
  ] },
  'racing-bulls': { carName: 'VCARB03', drivers: [
    { id: 'lindblad', name: 'Arvid Lindblad', shortName: 'Lindblad', role: null, number: 41, modelPath: teamModelManifest['racing-bulls'].path },
    { id: 'lawson', name: 'Liam Lawson', shortName: 'Lawson', role: null, number: 30, modelPath: '/models/racing-bulls-vcarb03-lawson.glb' },
  ] },
  'alpine': { carName: 'A526', drivers: [
    { id: 'colapinto', name: 'Franco Colapinto', shortName: 'Colapinto', role: null, number: 43, modelPath: teamModelManifest['alpine'].path },
    { id: 'gasly', name: 'Pierre Gasly', shortName: 'Gasly', role: null, number: 10, modelPath: '/models/alpine-a526-gasly.glb' },
  ] },
  'haas': { carName: 'VF26', drivers: [
    { id: 'bearman', name: 'Oliver Bearman', shortName: 'Bearman', role: null, number: 87, modelPath: teamModelManifest['haas'].path },
    { id: 'ocon', name: 'Esteban Ocon', shortName: 'Ocon', role: null, number: 31, modelPath: '/models/haas-vf26-ocon.glb' },
  ] },
  'audi': { carName: 'R26', drivers: [
    { id: 'bortoleto', name: 'Gabriel Bortoleto', shortName: 'Bortoleto', role: null, number: 5, modelPath: teamModelManifest['audi'].path },
    { id: 'hulkenberg', name: 'Nico Hülkenberg', shortName: 'Hülkenberg', role: null, number: 27, modelPath: '/models/audi-r26-hulkenberg.glb' },
  ] },
  'williams': { carName: 'FW48', drivers: [
    { id: 'albon', name: 'Alexander Albon', shortName: 'Albon', role: null, number: 23, modelPath: teamModelManifest['williams'].path },
    { id: 'sainz', name: 'Carlos Sainz', shortName: 'Sainz', role: null, number: 55, modelPath: '/models/williams-fw48-sainz.glb' },
  ] },
  'aston-martin': { carName: 'AMR26', drivers: [
    { id: 'alonso', name: 'Fernando Alonso', shortName: 'Alonso', role: null, number: 14, modelPath: teamModelManifest['aston-martin'].path },
    { id: 'stroll', name: 'Lance Stroll', shortName: 'Stroll', role: null, number: 18, modelPath: '/models/aston-martin-amr26-stroll.glb' },
  ] },
  'cadillac': { carName: 'MAC26', drivers: [
    { id: 'perez', name: 'Sergio Pérez', shortName: 'Pérez', role: null, number: 11, modelPath: teamModelManifest['cadillac'].path },
    { id: 'bottas', name: 'Valtteri Bottas', shortName: 'Bottas', role: null, number: 77, modelPath: '/models/cadillac-mac26-bottas.glb' },
  ] },
 }

const availableModels = new Set(Object.keys(import.meta.glob('/public/models/*.glb')).map(path => path.replace('/public', '')))
// TODO: identify the reserve in the authored variants and set role + airboxColor here; keep current assignments until verified.
// Set airboxColor only after checking the authored variant. Reserve variants must
// have a verified yellow airbox; missing metadata leaves them unavailable.
export const isDriverAvailable = (driver: ShowroomDriver) => availableModels.has(driver.modelPath) && (driver.role !== 'reserve' || driver.airboxColor === 'yellow')
export function getShowroomDriver(teamId: string, driverId?: string | null): ShowroomDriver {
  const team = showroomTeams[teamId]
  return team.drivers.find(driver => driver.id === driverId && isDriverAvailable(driver)) ?? team.drivers[0]
}
export function getDriverAsset(base: F1TechCarAsset, driver: ShowroomDriver): F1TechCarAsset {
  // Keep the audited geometry ID: focus, mappings and camera contracts use it.
  return isDriverAvailable(driver) && driver.modelPath !== base.path ? { ...base, path: driver.modelPath } : base
}

export const showroomLabels = {
  es: { driver: 'Piloto', soon: 'Próximamente' }, en: { driver: 'Driver', soon: 'Coming soon' },
  it: { driver: 'Pilota', soon: 'Prossimamente' }, pt: { driver: 'Piloto', soon: 'Em breve' },
  fr: { driver: 'Pilote', soon: 'Bientôt' }, de: { driver: 'Fahrer', soon: 'Demnächst' },
}

// Roles remain unresolved until all authored variants are identified; do not
// infer primary/reserve from array order or change the existing model assignments.
export const orderedDrivers = (team: ShowroomTeam) => [...team.drivers].sort((a, b) =>
  (a.role === 'primary' ? 0 : a.role === 'reserve' ? 2 : 1) -
  (b.role === 'primary' ? 0 : b.role === 'reserve' ? 2 : 1))
