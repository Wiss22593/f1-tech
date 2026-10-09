import { useEffect, useState } from 'react'
import { loadPublishedSeason, type PublishedUpdate } from '../../services/fia/published-dataset'
import { uniqueRecords } from './analytics.mjs'
export function useSeasonRecords(season = 2026) {
 const [state,setState]=useState<{season:number;records:PublishedUpdate[];loading:boolean;partial:boolean;dataState:'fresh'|'stale'|'offline'|'error'}>({season,records:[],loading:true,partial:false,dataState:'fresh'})
 useEffect(()=>{let active=true;void loadPublishedSeason(season).then(result=>{if(active)setState({season,records:uniqueRecords(result.updates),loading:false,partial:result.stale||result.errors.length>0,dataState:result.stale ? (navigator.onLine ? 'stale' : 'offline') : result.errors.length ? 'error' : 'fresh'})}).catch(()=>{if(active)setState({season,records:[],loading:false,partial:true,dataState:'error'})});return()=>{active=false}},[season])
 return state.season===season?state:{season,records:[],loading:true,partial:false,dataState:'fresh' as const}
}


