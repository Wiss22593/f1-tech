import type { CircuitProfile, TechnicalUpdate } from '../domain/technical'

export interface TechnicalDataProvider { readonly name: string; getUpdates(): Promise<TechnicalUpdate[]>; getCircuit(id: string): Promise<CircuitProfile | null> }
export interface DemoProvider extends TechnicalDataProvider { readonly name: 'DemoProvider' }
export interface FiaProvider extends TechnicalDataProvider { readonly name: 'FiaProvider' }
export interface PublicDocumentsProvider extends TechnicalDataProvider { readonly name: 'PublicDocumentsProvider' }
