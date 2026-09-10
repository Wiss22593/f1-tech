import { useEffect, useRef, useState } from 'react'
import { activeCarAsset, type CameraPresetId, type CarComponentId, type F1TechHotspot } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'
import { garageComponentGroups, garageGrandPrix, garageHotspots, garageTeams, getGarageUpdateChange, type GarageUpdate } from './data'
import { garageArea, garageCategory, garageComponent, garageGrandPrixName, garageText, technicalText, type Locale } from '../../i18n'
import { loadPublishedGrandPrix, toCarComponent } from '../../services/fia/published-dataset'

const cameraPresets: CameraPresetId[] = ['default', 'front', 'rear', 'side', 'top']
const teamAbbreviations: Record<string, string> = { mercedes: 'MER', ferrari: 'FER', mclaren: 'MCL', 'red-bull-racing': 'RBR', 'racing-bulls': 'RB', 'aston-martin': 'AST', alpine: 'ALP', haas: 'HAS', audi: 'AUD', williams: 'WIL', cadillac: 'CAD' }

export function GaragePage({ locale }: { locale: Locale }) {
  const copy = garageText(locale)
  const initialQuery = new URLSearchParams(window.location.search)
  const [grandPrixId, setGrandPrixId] = useState(() => garageGrandPrix.some((item) => item.id === initialQuery.get('gp')) ? initialQuery.get('gp')! : garageGrandPrix[0].id)
  const [teamId, setTeamId] = useState(() => garageTeams.some((item) => item.id === initialQuery.get('team')) ? initialQuery.get('team')! : garageTeams[0].id)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  const [selectedComponent, setSelectedComponent] = useState<CarComponentId>()
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [teamTouchStart, setTeamTouchStart] = useState<number>()
  const [publishedUpdates, setPublishedUpdates] = useState<GarageUpdate[]>([])
  const itemRefs = useRef<Partial<Record<CarComponentId, HTMLDivElement | null>>>({})
  const grandPrix = garageGrandPrix.find((item) => item.id === grandPrixId) ?? garageGrandPrix[0]
  const team = garageTeams.find((item) => item.id === teamId) ?? garageTeams[0]
  const updates = publishedUpdates.filter((update) => update.teamId === team.id && update.grandPrixId === grandPrix.id)
  const noUpdates = updates.length === 0
  const updatedComponents = new Set(updates.map((update) => update.componentId))
  const updatedHotspots = garageHotspots.filter((hotspot, index, all) => updatedComponents.has(hotspot.componentId) && all.findIndex((item) => item.componentId === hotspot.componentId) === index)
  const selectedHotspot = garageHotspots.find((hotspot) => hotspot.componentId === selectedComponent)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    query.set('gp', grandPrixId); query.set('team', teamId)
    window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`)
  }, [grandPrixId, teamId])
  useEffect(() => { if (selectedComponent) itemRefs.current[selectedComponent]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [selectedComponent])
  useEffect(() => {
    let active = true
    void loadPublishedGrandPrix(grandPrixId).then(({ dataset }) => {
      if (!active) return
      setPublishedUpdates((dataset?.updates ?? []).flatMap((record) => {
        const componentId = toCarComponent(record.componentId)
        if (!componentId) return []
        return [{ id: record.id, teamId: record.teamId, grandPrixId: record.grandPrixId, componentId, status: record.technicalState === 'SUBMITTED' ? 'SUBMITTED' : 'SUBMITTED', presentedComponent: record.componentId, primaryReason: record.category ?? '', geometricDifference: record.sourceText, description: record.description ?? record.sourceText, source: { type: 'FIA', label: 'FIA Car Presentation Submission', document: record.sourceDocument, date: record.publishedAt }, confidence: 'CONFIRMED', magnitude: (record.magnitude ?? '') as GarageUpdate['magnitude'], objective: record.objective ?? '', area: record.area ?? '' }]
      }))
    })
    return () => { active = false }
  }, [grandPrixId])
  function resetView() { setSelectedComponent(undefined); setCameraPreset('default'); setFocusRequestId((value) => value + 1) }
  function selectPiece(componentId: CarComponentId) { setSelectedComponent((current) => current === componentId ? undefined : componentId); setCameraPreset('default'); setFocusRequestId((value) => value + 1) }
  function changeGrandPrix(id: string) { setGrandPrixId(id); resetView() }
  function changeTeam(id: string) { setTeamId(id); resetView() }
  function stepTeam(direction: 1 | -1) { const current = garageTeams.findIndex((item) => item.id === teamId); changeTeam(garageTeams[(current + direction + garageTeams.length) % garageTeams.length].id) }
  function selectCamera(preset: CameraPresetId) { if (preset === 'default') resetView(); else { setCameraPreset(preset); setSelectedComponent(undefined) } }
  function renderComponent(hotspot: F1TechHotspot) {
    const componentUpdates = updates.filter((update) => update.componentId === hotspot.componentId)
    const expanded = selectedComponent === hotspot.componentId
    return <div className={`showroom-component${expanded ? ' showroom-component--expanded' : ''}`} key={hotspot.id} ref={(node) => { itemRefs.current[hotspot.componentId] = node }}>
      <button type="button" className={`showroom-piece${expanded ? ' showroom-piece--selected' : ''}${componentUpdates.length ? ' showroom-piece--active' : ''}`} onClick={() => selectPiece(hotspot.componentId)} aria-expanded={expanded}>
        <i /><span>{garageComponent(locale, hotspot.id, hotspot.label)}</span>{componentUpdates.length > 0 && <em>● {copy.updated}</em>}<b aria-hidden="true">{expanded ? '−' : '+'}</b>
      </button>
      {expanded && <div className="showroom-inline-detail" aria-live="polite">
        {componentUpdates.length === 0 ? <p>{copy.noUpdate}</p> : componentUpdates.map((update) => <article className="showroom-submission" key={update.id}>
          <header><span>{copy.updated}</span></header>
          <dl>
            <div><dt>{copy.whatChanged}</dt><dd>{getGarageUpdateChange(update, locale)}</dd></div>
            <div><dt>{copy.area}</dt><dd>{garageArea(locale, update.area)}</dd></div>
            <div><dt>{copy.objective}</dt><dd>{technicalText(locale, update.objective)}</dd></div>
            <div><dt>{copy.magnitude}</dt><dd>{technicalText(locale, update.magnitude)}</dd></div>
          </dl>
        </article>)}</div>}
    </div>
  }

  return <section className="showroom" style={{ '--team-primary': team.theme.primary, '--team-accent': team.theme.accent, '--team-surface': team.theme.surface } as React.CSSProperties} aria-labelledby="showroom-title">
    <section className="showroom__stage">
      <div className="showroom__heading"><h1 id="showroom-title">F1 TECH<span>.</span></h1></div>
      <div className="showroom__context"><label className="sr-only" htmlFor="grand-prix-selector">{copy.grandPrix}</label><span className="showroom-gp-select"><select id="grand-prix-selector" value={grandPrixId} onChange={(event) => changeGrandPrix(event.target.value)}>{garageGrandPrix.map((item) => <option key={item.id} value={item.id}>{garageGrandPrixName(locale, item.id, item.name)}</option>)}</select></span><strong>{team.name.toUpperCase()}</strong><span>{grandPrix.circuit}</span></div>
      <div className="showroom__canvas"><ModelViewer asset={activeCarAsset} locale={locale} cameraPreset={cameraPreset} theme={team.theme} hotspots={garageHotspots} activeComponents={[...updatedComponents]} selectedComponent={selectedComponent} selectedHotspot={selectedHotspot} focusRequestId={focusRequestId} showCallouts={false} onSelectComponent={selectPiece} /></div>
      <aside className="showroom-panel" aria-label={copy.components}>
        <div className="showroom-panel__top"><p className="section-kicker">{copy.components}</p><span>{noUpdates ? copy.noSubmitted : `${updates.length.toString().padStart(2, '0')} ${copy.submitted}`}</span></div>
        <div className="showroom-pieces">
          {updatedHotspots.length > 0 && <section className="showroom-piece-group showroom-piece-group--updates"><h3>{copy.updated}</h3>{updatedHotspots.map(renderComponent)}</section>}
          {garageComponentGroups.map((group) => { const remaining = group.componentIds.map((id) => garageHotspots.find((hotspot) => hotspot.id === id)).filter((item): item is F1TechHotspot => item !== undefined).filter((item) => !updatedComponents.has(item.componentId)); return remaining.length > 0 && <section className="showroom-piece-group" key={group.id}><h3>{garageCategory(locale, group.id)}</h3>{remaining.map(renderComponent)}</section> })}
        </div>
      </aside>
      <div className="showroom__views" aria-label={copy.views}>{cameraPresets.map((preset) => <button type="button" className={cameraPreset === preset && !selectedComponent ? 'showroom-view showroom-view--active' : 'showroom-view'} key={preset} onClick={() => selectCamera(preset)}>{copy[preset === 'default' ? 'reset' : preset]}</button>)}</div><p className="showroom__hint">{copy.hint}</p>
      <div className="showroom-teambar showroom-teambar--desktop" aria-label={copy.teamSelector}>{garageTeams.map((item) => { const count = publishedUpdates.filter((update) => update.teamId === item.id && update.grandPrixId === grandPrix.id).length; return <button type="button" className={item.id === teamId ? 'showroom-team showroom-team--selected' : 'showroom-team'} key={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.theme.primary } as React.CSSProperties}><i /><span>{item.name}</span><em>{count ? `${count.toString().padStart(2, '0')} ${copy.submitted}` : copy.noSubmitted}</em></button> })}</div>
      <div className="showroom-team-mobile" aria-label={copy.teamSelector} onTouchStart={(event) => setTeamTouchStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { const start = teamTouchStart; if (start === undefined) return; const difference = event.changedTouches[0].clientX - start; if (Math.abs(difference) > 42) stepTeam(difference < 0 ? 1 : -1); setTeamTouchStart(undefined) }}>
        <button type="button" onClick={() => stepTeam(-1)} aria-label={copy.previousTeam}>←</button><strong>{teamAbbreviations[team.id]}</strong><span>{garageTeams.findIndex((item) => item.id === team.id) + 1} {copy.teamPosition} {garageTeams.length}</span><button type="button" onClick={() => stepTeam(1)} aria-label={copy.nextTeam}>→</button>
      </div>
    </section>
  </section>
}
