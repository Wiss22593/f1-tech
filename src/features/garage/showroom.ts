import { type F1TechCarAsset } from '../../three/assets'
import { teamModelManifest } from '../../three/model-manifest.mjs'

export interface ShowroomDriver { id: string; name: string; shortName: string; role: 'primary' | 'reserve' | null; number: number | null; modelPath: F1TechCarAsset['path'] }
export interface ShowroomTeam { carName: string; drivers: ShowroomDriver[] }
// Line-up: https://www.formula1.com/en/teams
// Adding the named GLB to public/models activates its chip at the next Vite start/build.
export const showroomTeams: Record<string, ShowroomTeam> = {
  'mercedes': { carName: 'W17', drivers: [
    { id: 'antonelli', name: 'Kimi Antonelli', shortName: 'Antonelli', role: null, number: null, modelPath: teamModelManifest['mercedes'].path },
    { id: 'russell', name: 'George Russell', shortName: 'Russell', role: null, number: null, modelPath: '/models/mercedes-w17-russell.glb' },
  ] },
  'ferrari': { carName: 'SF26', drivers: [
    { id: 'leclerc', name: 'Charles Leclerc', shortName: 'Leclerc', role: null, number: null, modelPath: teamModelManifest['ferrari'].path },
    { id: 'hamilton', name: 'Lewis Hamilton', shortName: 'Hamilton', role: null, number: null, modelPath: '/models/ferrari-sf26-hamilton.glb' },
  ] },
  'mclaren': { carName: 'MCL40', drivers: [
    { id: 'norris', name: 'Lando Norris', shortName: 'Norris', role: null, number: null, modelPath: teamModelManifest['mclaren'].path },
    { id: 'piastri', name: 'Oscar Piastri', shortName: 'Piastri', role: null, number: null, modelPath: '/models/mclaren-mcl40-piastri.glb' },
  ] },
  'red-bull-racing': { carName: 'RB22', drivers: [
    { id: 'verstappen', name: 'Max Verstappen', shortName: 'Verstappen', role: null, number: null, modelPath: teamModelManifest['red-bull-racing'].path },
    { id: 'hadjar', name: 'Isack Hadjar', shortName: 'Hadjar', role: null, number: null, modelPath: '/models/red-bull-rb22-hadjar.glb' },
  ] },
  'racing-bulls': { carName: 'VCARB03', drivers: [
    { id: 'lindblad', name: 'Arvid Lindblad', shortName: 'Lindblad', role: null, number: null, modelPath: teamModelManifest['racing-bulls'].path },
    { id: 'lawson', name: 'Liam Lawson', shortName: 'Lawson', role: null, number: null, modelPath: '/models/racing-bulls-vcarb03-lawson.glb' },
  ] },
  'alpine': { carName: 'A526', drivers: [
    { id: 'colapinto', name: 'Franco Colapinto', shortName: 'Colapinto', role: null, number: null, modelPath: teamModelManifest['alpine'].path },
    { id: 'gasly', name: 'Pierre Gasly', shortName: 'Gasly', role: null, number: null, modelPath: '/models/alpine-a526-gasly.glb' },
  ] },
  'haas': { carName: 'VF26', drivers: [
    { id: 'bearman', name: 'Oliver Bearman', shortName: 'Bearman', role: null, number: null, modelPath: teamModelManifest['haas'].path },
    { id: 'ocon', name: 'Esteban Ocon', shortName: 'Ocon', role: null, number: null, modelPath: '/models/haas-vf26-ocon.glb' },
  ] },
  'audi': { carName: 'R26', drivers: [
    { id: 'bortoleto', name: 'Gabriel Bortoleto', shortName: 'Bortoleto', role: null, number: null, modelPath: teamModelManifest['audi'].path },
    { id: 'hulkenberg', name: 'Nico Hulkenberg', shortName: 'Hulkenberg', role: null, number: null, modelPath: '/models/audi-r26-hulkenberg.glb' },
  ] },
  'williams': { carName: 'FW48', drivers: [
    { id: 'albon', name: 'Alexander Albon', shortName: 'Albon', role: null, number: null, modelPath: teamModelManifest['williams'].path },
    { id: 'sainz', name: 'Carlos Sainz', shortName: 'Sainz', role: null, number: null, modelPath: '/models/williams-fw48-sainz.glb' },
  ] },
  'aston-martin': { carName: 'AMR26', drivers: [
    { id: 'alonso', name: 'Fernando Alonso', shortName: 'Alonso', role: null, number: null, modelPath: teamModelManifest['aston-martin'].path },
    { id: 'stroll', name: 'Lance Stroll', shortName: 'Stroll', role: null, number: null, modelPath: '/models/aston-martin-amr26-stroll.glb' },
  ] },
  'cadillac': { carName: 'MAC26', drivers: [
    { id: 'perez', name: 'Sergio Perez', shortName: 'Perez', role: null, number: null, modelPath: teamModelManifest['cadillac'].path },
    { id: 'bottas', name: 'Valtteri Bottas', shortName: 'Bottas', role: null, number: null, modelPath: '/models/cadillac-mac26-bottas.glb' },
  ] },
 }

const availableModels = new Set(Object.keys(import.meta.glob('/public/models/*.glb')).map(path => path.replace('/public', '')))
export const isDriverAvailable = (driver: ShowroomDriver) => availableModels.has(driver.modelPath)
export function getDriverAsset(base: F1TechCarAsset, driver: ShowroomDriver): F1TechCarAsset {
  // Keep the audited geometry ID: focus, mappings and camera contracts use it.
  return isDriverAvailable(driver) && driver.modelPath !== base.path ? { ...base, path: driver.modelPath } : base
}

export const showroomLabels = {
  es: { driver: 'Piloto', soon: 'Próximamente' }, en: { driver: 'Driver', soon: 'Coming soon' },
  it: { driver: 'Pilota', soon: 'Prossimamente' }, pt: { driver: 'Piloto', soon: 'Em breve' },
  fr: { driver: 'Pilote', soon: 'Bientôt' }, de: { driver: 'Fahrer', soon: 'Demnächst' },
}

// Roles and racing numbers are intentionally unresolved: the existing repository
// does not identify reserves or provide an audited driver-number source.
export const orderedDrivers = (team: ShowroomTeam) => [...team.drivers].sort((a, b) =>
  (a.role === 'primary' ? 0 : a.role === 'reserve' ? 2 : 1) -
  (b.role === 'primary' ? 0 : b.role === 'reserve' ? 2 : 1))
