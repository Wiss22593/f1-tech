import { useState } from 'react'
import { type Locale, uiText, dataStateText } from '../../i18n'
import { teams } from '../teams/data'
import { grandsPrix } from '../../data/grands-prix'
import { supportedSeasons } from '../../domain/calendar.mjs'
import { teamThemes } from '../garage/data'
import { AdSlot } from '../../components/ads/AdSlot'
import { localizeFiaUpdate } from '../../services/fia/localization.mjs'
import { useSeasonRecords } from '../insights/useSeasonRecords'
import { insightText as text } from '../insights/copy'
import { familyKey, reasonKey, typeKey, groupCounts, filterRecords, eventSeries } from '../insights/analytics.mjs'
import { RecordList } from '../insights/RecordList'
type Filters = {teamId:string;grandPrixId:string;family:string;reason:string;type:string}
const emptyFilters:Filters={teamId:'',grandPrixId:'',family:'',reason:'',type:''}
export function UpdatesPage({locale}:{locale:Locale}) {
 const [season,setSeason]=useState(2026)
 const [filters,setFilters]=useState<Filters>(()=>({...emptyFilters,teamId:new URLSearchParams(location.search).get('team')||''}))
 const [limit,setLimit]=useState(30)
 const {records,loading,partial,dataState}=useSeasonRecords(season)
 const visible=filterRecords(records,filters)
 const events=grandsPrix.filter(g=>g.season===season).sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''))
 const activeEvents=events.filter(g=>records.some(r=>r.grandPrixId===g.id))
 const activeTeams=teams.filter(t=>visible.some(r=>r.teamId===t.id))
 const series=eventSeries(visible,activeEvents,activeTeams.map(t=>t.id))
 const label=(key:string)=>key==='__unspecified'?text(locale,'unspecified'):key
 const familyLabel=(key:string)=>{const r=records.find(r=>familyKey(r)===key);return r?localizeFiaUpdate(r,locale).componentLabel:label(key)}
 const reasonLabel=(key:string)=>{const r=records.find(r=>reasonKey(r)===key);return r?localizeFiaUpdate(r,locale).primaryReason||label(key):label(key)}
 function select(field:keyof Filters,value:string){setFilters(current=>({...current,[field]:value}));setLimit(30)}
 function bars(title:string,field:keyof Filters,rows:[string,number][],getLabel:(key:string)=>string,color=false) {
 const max=Math.max(1,...rows.map(([,n])=>n))
 return <article className="atlas-panel card"><h2>{title}</h2><p className="atlas-caption">{text(locale,'records')} · 0—{max}</p><div className="atlas-bars">{rows.map(([key,n])=><button key={key} className="atlas-bar" onClick={()=>select(field,key)} title={getLabel(key)+' · '+n}><span>{getLabel(key)}</span><i><b style={{width:(n/max*100)+'%',background:color?teamThemes[key]?.accent:undefined}}/></i><strong>{n}</strong></button>)}</div></article>
 }
 const reasons=groupCounts(visible,reasonKey)
 let angle=0
 const palette=['#f26755','#66c9cb','#b596ef','#edba58','#90b776','#db82af','#739cdf']
 const stops=reasons.map(([,n],i)=>{const start=angle;angle+=n/Math.max(1,visible.length)*100;return palette[i%palette.length]+' '+start+'% '+angle+'%'}).join(',')
 const ymax=Math.max(1,...series.flatMap(s=>s.values.map(v=>v.cumulative)))
 return <section className="atlas-page dashboard__content" aria-labelledby="updates-title">
 <nav className="atlas-nav"><a href="/actualizaciones" aria-current="page">{uiText(locale,'updatesTitle')}</a><a href="/equipos">{uiText(locale,'teamsTitle')}</a><a href="/pilotos">{text(locale,'drivers')}</a></nav>
 <header className="atlas-hero"><div><p className="section-kicker">FIA / CAR PRESENTATION SUBMISSIONS</p><h1 id="updates-title">{text(locale,'analysis')}<span>.</span></h1><p>{text(locale,'subtitle')}</p></div><span className="atlas-season">{season}</span></header>
 <div className="atlas-filters card"><label>{uiText(locale,'season')}<select value={season} onChange={e=>{setSeason(Number(e.target.value));setFilters(emptyFilters);setLimit(30)}}>{supportedSeasons(grandsPrix).map(s=><option key={s}>{s}</option>)}</select></label>
 {([
 ['teamId',uiText(locale,'team'),teams.map(t=>[t.id,t.name])],
 ['grandPrixId','Grand Prix',events.map(g=>[g.id,g.name])],
 ['family',text(locale,'components'),groupCounts(records,familyKey).map(([k])=>[k,familyLabel(k)])],
 ['type',text(locale,'types'),groupCounts(records,typeKey).map(([k])=>[k,label(k)])],
 ['reason',text(locale,'reason'),groupCounts(records,reasonKey).map(([k])=>[k,reasonLabel(k)])],
 ] as [keyof Filters,string,string[][]][]).map(([field,title,options])=><label key={field}>{title}<select aria-label={title} value={filters[field]} onChange={e=>select(field,e.target.value)}><option value="">{uiText(locale,'all')}</option>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}
 <button onClick={()=>{setFilters(emptyFilters);setLimit(30)}}>{uiText(locale,'clearFilters')}</button></div>
 {loading?<p className="atlas-loading" role="status">{text(locale,'loading')}</p>:partial?<p className="atlas-notice" role="status">{dataStateText(locale,dataState==='fresh'?'error':dataState)}</p>:null}
 <section className="atlas-stats" aria-live="polite">{[[visible.length,text(locale,'records')],[new Set(visible.map(familyKey)).size,text(locale,'families')],[new Set(visible.map(r=>r.grandPrixId)).size,text(locale,'events')],[new Set(visible.map(r=>r.sourceUrl)).size,text(locale,'documents')]].map(([n,title])=><div className="card" key={title}><strong>{loading?'—':n}</strong><span>{title}</span></div>)}</section>
 <p className="atlas-notice">{text(locale,'methodology')}</p>
 {!loading&&visible.length>0?<div className="atlas-charts">
 {bars(text(locale,'ranking'),'teamId',groupCounts(visible,r=>r.teamId),k=>teams.find(t=>t.id===k)?.name||k,true)}
 <article className="atlas-panel card"><h2>{text(locale,'distribution')}</h2><div className="atlas-donut-layout"><div className="atlas-donut" aria-hidden="true" style={{background:'conic-gradient('+stops+')'}}><strong>{visible.length}</strong></div><div className="atlas-legend">{reasons.map(([k,n],i)=><button key={k} onClick={()=>select('reason',k)} title={reasonLabel(k)+' · '+n}><i style={{background:palette[i%palette.length]}}/><span>{reasonLabel(k)}</span><b>{n} <small>({(n/visible.length*100).toFixed(1)}%)</small></b></button>)}</div></div></article>
 {bars(text(locale,'components'),'family',groupCounts(visible,familyKey),familyLabel)}
 <article className="atlas-panel card"><h2>{text(locale,'timeline')}</h2><div className="atlas-local-scroll" tabIndex={0} role="region" aria-label={text(locale,'timeline')}><table className="atlas-matrix"><caption>{text(locale,'records')}</caption><thead><tr><th>GP</th>{activeTeams.map(t=><th key={t.id} title={t.name}>{t.name}</th>)}</tr></thead><tbody>{activeEvents.map((g,i)=><tr key={g.id}><th>{g.name}</th>{series.map(s=><td key={s.teamId}><button disabled={!s.values[i].count} title={g.name+' · '+s.teamId+' · '+s.values[i].count} onClick={()=>{setFilters(f=>({...f,teamId:s.teamId,grandPrixId:g.id}));setLimit(30)}} style={{background:s.values[i].count?'color-mix(in srgb, '+teamThemes[s.teamId].accent+' '+Math.min(75,15+s.values[i].count*5)+'%, #171a23)':undefined}}>{s.values[i].count||'—'}</button></td>)}</tr>)}</tbody></table></div></article>
 <article className="atlas-panel atlas-panel-wide card"><h2>{text(locale,'cumulative')}</h2><div className="atlas-local-scroll" tabIndex={0} role="region" aria-label={text(locale,'cumulative')}><svg className="atlas-lines" viewBox="0 0 900 290" role="img" aria-label={text(locale,'cumulative')}><title>{text(locale,'cumulative')}</title>{[0,.25,.5,.75,1].map(f=><g key={f}><line x1="45" x2="865" y1={230-f*200} y2={230-f*200} stroke="#343945"/><text x="5" y={235-f*200} fill="#bbc2d0" fontSize="12">{Math.round(ymax*f)}</text></g>)}{series.map(s=><g key={s.teamId}><polyline fill="none" stroke={teamThemes[s.teamId].accent} strokeWidth="2.5" points={s.values.map((v,i)=>(45+i*820/Math.max(1,activeEvents.length-1))+','+(230-v.cumulative/ymax*200)).join(' ')}/>{s.values.map((v,i)=><circle key={v.eventId} cx={45+i*820/Math.max(1,activeEvents.length-1)} cy={230-v.cumulative/ymax*200} r="4" fill={teamThemes[s.teamId].accent}><title>{s.teamId+' · '+activeEvents[i].name+' · '+v.cumulative}</title></circle>)}</g>)}{activeEvents.map((g,i)=><text key={g.id} x={45+i*820/Math.max(1,activeEvents.length-1)} y="254" transform={'rotate(35 '+(45+i*820/Math.max(1,activeEvents.length-1))+' 254)'} fill="#bbc2d0" fontSize="10">{String(i+1).padStart(2,'0')}</text>)}</svg><table className="atlas-matrix"><caption>{text(locale,'cumulative')} · GP</caption><thead><tr><th>{uiText(locale,'team')}</th>{activeEvents.map((g,i)=><th key={g.id} title={g.name}>{i+1}<small>{g.name}</small></th>)}</tr></thead><tbody>{series.map(s=><tr key={s.teamId}><th><i className="atlas-dot" style={{background:teamThemes[s.teamId].accent}}/>{teams.find(t=>t.id===s.teamId)?.name}</th>{s.values.map(v=><td key={v.eventId}>{v.cumulative}</td>)}</tr>)}</tbody></table></div></article>
 </div>:!loading?<div className="atlas-empty card">{text(locale,'empty')}</div>:null}
 <div className="atlas-section-title"><h2>{text(locale,'records')}</h2><span>{visible.length}</span></div><RecordList records={visible.slice(0,limit)} locale={locale}/>{limit<visible.length&&<button className="atlas-more" onClick={()=>setLimit(n=>n+30)}>{text(locale,'more')} ({Math.min(limit,visible.length)}/{visible.length})</button>}
 <AdSlot locale={locale} placementId="updates-bottom"/>
 </section>
}



