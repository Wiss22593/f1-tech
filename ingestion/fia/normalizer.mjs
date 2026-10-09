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

/** Exact complete heading identities; never match a team mentioned in a description. */
const headingKey = value => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const headings = [
 ['mercedes',['Mercedes-AMG PETRONAS F1 Team']],
 ['ferrari',['Scuderia Ferrari HP']],
 ['mclaren',['McLaren Mastercard F1 Team','McLaren Formula 1 Team']],
 ['red-bull-racing',['Oracle Red Bull Racing']],
 ['racing-bulls',['Visa Cash App Racing Bulls']],
 ['alpine',['BWT Alpine F1 Team','BWT Alpine Formula One Team']],
 ['haas',['TGR HAAS F1 TEAM','HAAS','Moneygram Haas F1 Team']],
 ['audi',['Audi Revolut F1 Team']],
 ['williams',['Williams','Atlassian Williams F1','Atlassian Williams F1 Team']],
 ['aston-martin',['Aston Martin Aramco F1 Team']],
 ['cadillac',['Cadillac','Cadillac Formula 1 Team']],
]
export function normalizeTeamHeading(value='') {
 const matches=headings.filter(([,names])=>names.some(name=>headingKey(name)===headingKey(value)))
 return matches.length===1?matches[0][0]:null
}
