import { demoCircuit, demoTechnicalUpdates } from '../data/demo/technical'
import type { DemoProvider } from './types'

export const demoProvider: DemoProvider = { name: 'DemoProvider', async getUpdates() { return demoTechnicalUpdates }, async getCircuit(id) { return id === demoCircuit.id ? demoCircuit : null } }
