/** Official entry names and short names are mapped deliberately and conservatively. */
const teams = [
  ['mercedes-amg petronas f1 team', 'mercedes'], ['mercedes', 'mercedes'],
  ['s cuderia ferrari hp', 'ferrari'], ['scuderia ferrari hp', 'ferrari'], ['ferrari', 'ferrari'],
  ['mclaren formula 1 team', 'mclaren'], ['mclaren', 'mclaren'],
  ['oracle red bull racing', 'red-bull-racing'], ['red bull racing', 'red-bull-racing'], ['red bull', 'red-bull-racing'],
  ['visa cash app racing bulls', 'racing-bulls'], ['racing bulls', 'racing-bulls'],
  ['bwt alpine formula one team', 'alpine'], ['alpine', 'alpine'],
  ['tgr haas f1 team', 'haas'], ['moneygram haas f1 team', 'haas'], ['haas', 'haas'],
  ['audi', 'audi'], ['williams', 'williams'], ['aston martin aramco f1 team', 'aston-martin'], ['aston martin', 'aston-martin'], ['c adillac', 'cadillac'], ['cadillac', 'cadillac'],
]
import { mapFiaComponent } from './component-registry.mjs'
export const normalizeTeam = (value = '') => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  return teams.find(([, id]) => normalized === id)?.[1] ?? teams.find(([term]) => normalized.includes(term))?.[1] ?? null
}
export const normalizeComponent = (value = '') => {
  return mapFiaComponent(value ?? '')
}
