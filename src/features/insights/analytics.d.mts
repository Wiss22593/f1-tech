import type { PublishedUpdate } from '../../services/fia/published-dataset'
export function uniqueRecords(records: PublishedUpdate[]): PublishedUpdate[]
export function familyKey(record: PublishedUpdate): string
export function reasonKey(record: PublishedUpdate): string
export function typeKey(record: PublishedUpdate): string
export function filterRecords(records: PublishedUpdate[], filters: Record<string,string>): PublishedUpdate[]
export function groupCounts(records: PublishedUpdate[], key: (record: PublishedUpdate) => string): [string,number][]
export function eventSeries(records: PublishedUpdate[], events: readonly {id:string}[], teamIds:string[]): {teamId:string;values:{eventId:string;count:number;cumulative:number}[]}[]
