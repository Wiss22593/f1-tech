import { useEffect, useRef, useState } from 'react'
import { activeCarAsset, type CameraPresetId, type CarComponentId, type F1TechHotspot } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'
import { garageComponentGroups, garageGrandPrix, garageHotspots, garageTeams, getGarageUpdateContent, type GarageUpdate } from './data'
import { garageCategory, garageComponent, garageGrandPrixName, garageText, uiText, type Locale } from '../../i18n'
import { loadPublishedGrandPrix, toCarComponent } from '../../services/fia/published-dataset'

const cameraPresets: CameraPresetId[] = ['default', 'front', 'rear', 'side', 'top']
const teamAbbreviations: Record<string, string> = { mercedes: 'MER', ferrari: 'FER', mclaren: 'MCL', 'red-bull-racing': 'RBR', 'racing-bulls': 'RB', 'aston-martin': 'AST', alpine: 'ALP', haas: 'HAA', audi: 'AUD', williams: 'WIL', cadillac: 'CAD' }
const defaultGrandPrix = [...garageGrandPrix].reverse().find(({ status }) => status === 'completed') ?? garageGrandPrix[0]

export function GaragePage({ locale }: { locale: Locale }) {
  const copy = garageText(locale)
  const initialQuery = new URLSearchParams(window.location.search)
  const [grandPrixId, setGrandPrixId] = useState(() => garageGrandPrix.some((item) => item.id === initialQuery.get('gp')) ? initialQuery.get('gp')! : defaultGrandPrix.id)
  const [teamId, setTeamId] = useState(() => garageTeams.some((item) => item.id === initialQuery.get('team')) ? initialQuery.get('team')! : garageTeams[0].id)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  const [selectedComponent, setSelectedComponent] = useState<CarComponentId>()
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [publishedUpdates, setPublishedUpdates] = useState<GarageUpdate[]>([])
  const [mobileUpdatesExpanded, setMobileUpdatesExpanded] = useState(false)
  const itemRefs = useRef<Partial<Record<CarComponentId, HTMLDivElement | null>>>({})
  const grandPrix = garageGrandPrix.find((item) => item.id === grandPrixId) ?? defaultGrandPrix
  const team = garageTeams.find((item) => item.id === teamId) ?? garageTeams[0]
  const updates = publishedUpdates.filter((update) => update.teamId === team.id && update.grandPrixId === grandPrix.id)
  const noUpdates = updates.length === 0
  const updatedComponents = new Set(updates.map((update) => update.componentId))
  const updatedHotspots = garageHotspots.filter((hotspot, index, all) => updatedComponents.has(hotspot.componentId) && all.findIndex((item) => item.componentId === hotspot.componentId) === index)
  const selectedHotspot = garageHotspots.find((hotspot) => hotspot.componentId === selectedComponent)
  const mobileUpdateLimit = 3
  const mobileHotspots = mobileUpdatesExpanded ? updatedHotspots : updatedHotspots.slice(0, mobileUpdateLimit)
  const hiddenMobileUpdates = Math.max(updatedHotspots.length - mobileUpdateLimit, 0)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    query.set('gp', grandPrixId); query.set('team', teamId)
    window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`)
  }, [grandPrixId, teamId])
  useEffect(() => {
    if (window.matchMedia('(max-width: 600px)').matches) return
    if (selectedComponent) itemRefs.current[selectedComponent]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedComponent])
  useEffect(() => {
    let active = true
    void loadPublishedGrandPrix(grandPrixId).then(({ dataset }) => {
      if (!active) return
      setPublishedUpdates((dataset?.updates ?? []).flatMap((record) => {
        const componentId = toCarComponent(record.componentId)
        if (!componentId) return []
        return [{ id: record.id, teamId: record.teamId, grandPrixId: record.grandPrixId, componentId, status: 'SUBMITTED', presentedComponent: record.componentName ?? null, primaryReason: record.primaryReason ?? record.category, geometricDifference: record.geometricDifference ?? null, description: record.briefDescription ?? record.description ?? record.sourceText, source: { type: 'FIA', label: 'FIA Car Presentation Submission', document: record.sourceDocument, date: record.publishedAt }, confidence: 'CONFIRMED', magnitude: (record.magnitude ?? '') as GarageUpdate['magnitude'], objective: record.objective ?? '', area: record.area ?? '' }]
      }))
    })
    return () => { active = false }
  }, [grandPrixId])
  function resetView() { setSelectedComponent(undefined); setCameraPreset('default'); setFocusRequestId((value) => value + 1); setMobileUpdatesExpanded(false) }
  function selectPiece(componentId: CarComponentId) { setSelectedComponent((current) => current === componentId ? undefined : componentId); setCameraPreset('default'); setFocusRequestId((value) => value + 1) }
  function changeGrandPrix(id: string) { setGrandPrixId(id); resetView() }
  function changeTeam(id: string) { setTeamId(id); resetView() }
  function selectCamera(preset: CameraPresetId) { if (preset === 'default') resetView(); else { setCameraPreset(preset); setSelectedComponent(undefined) } }
  function renderUpdateDetails(componentUpdates: GarageUpdate[]) {
    return componentUpdates.length === 0 ? <p>{copy.noUpdate}</p> : componentUpdates.map((update) => {
      const content = getGarageUpdateContent(update, locale)
      return <article className="showroom-submission" key={update.id}>
        {content.presentedComponent && <h3>{content.presentedComponent}</h3>}
        {content.primaryReason && <p className="showroom-submission__reason">{content.primaryReason}</p>}
        {content.geometricDifference && <p className="showroom-submission__geometry">{content.geometricDifference}</p>}
        {content.description && <p className="showroom-submission__description">{content.description}</p>}
      </article>
    })
  }
  function renderComponent(hotspot: F1TechHotspot) {
    const componentUpdates = updates.filter((update) => update.componentId === hotspot.componentId)
    const expanded = selectedComponent === hotspot.componentId
    return <div className={`showroom-component${expanded ? ' showroom-component--expanded' : ''}`} key={hotspot.id} ref={(node) => { itemRefs.current[hotspot.componentId] = node }}>
      <button type="button" className={`showroom-piece${expanded ? ' showroom-piece--selected' : ''}${componentUpdates.length ? ' showroom-piece--active' : ''}`} onClick={() => selectPiece(hotspot.componentId)} aria-expanded={expanded}>
        <i /><span>{garageComponent(locale, hotspot.id, hotspot.label)}</span>{componentUpdates.length > 0 && <em>● {copy.updated}</em>}<b aria-hidden="true">{expanded ? '−' : '+'}</b>
      </button>
      {expanded && <div className="showroom-inline-detail" aria-live="polite">{renderUpdateDetails(componentUpdates)}</div>}
    </div>
  }

  return <section className="showroom" style={{ '--team-primary': team.theme.primary, '--team-accent': team.theme.accent, '--team-surface': team.theme.surface } as React.CSSProperties} aria-labelledby="showroom-title">
    <section className="showroom__stage">
      <div className="showroom__heading"><h1 id="showroom-title">F1 TECH<span>.</span></h1></div>
      <div className="showroom__context"><label className="sr-only" htmlFor="grand-prix-selector">{copy.grandPrix}</label><span className="showroom-gp-select"><select id="grand-prix-selector" value={grandPrixId} onChange={(event) => changeGrandPrix(event.target.value)}>{garageGrandPrix.map((item) => <option key={item.id} value={item.id}>{garageGrandPrixName(locale, item.id, item.name)}</option>)}</select></span><strong>{team.name.toUpperCase()}</strong><span>{grandPrix.circuit}</span></div>
      <div className="showroom__canvas"><ModelViewer asset={activeCarAsset} locale={locale} cameraPreset={cameraPreset} theme={team.theme} hotspots={garageHotspots} activeComponents={[...updatedComponents]} selectedComponent={selectedComponent} selectedHotspot={selectedHotspot} focusRequestId={focusRequestId} showCallouts={false} onSelectComponent={selectPiece} /></div>
      <div className="showroom-mobile-toolbar">
        <div className={`showroom-mobile-updates${mobileUpdatesExpanded ? ' showroom-mobile-updates--expanded' : ''}`} aria-label={uiText(locale, 'updatesTitle')}>
          <h2>{uiText(locale, 'updatesTitle')}</h2>
          {noUpdates ? <p className="showroom-mobile-updates__empty">{copy.noPublished}</p> : <>
            <div className="showroom-mobile-updates__list">{mobileHotspots.map((hotspot) => <button type="button" className={selectedComponent === hotspot.componentId ? 'showroom-mobile-chip showroom-mobile-chip--selected' : 'showroom-mobile-chip'} key={hotspot.id} onClick={() => selectPiece(hotspot.componentId)} aria-pressed={selectedComponent === hotspot.componentId}><i />{garageComponent(locale, hotspot.id, hotspot.label)}</button>)}</div>
            {hiddenMobileUpdates > 0 && <button type="button" className="showroom-mobile-updates__more" onClick={() => setMobileUpdatesExpanded((expanded) => !expanded)} aria-expanded={mobileUpdatesExpanded}>{mobileUpdatesExpanded ? '−' : `+${hiddenMobileUpdates} ${copy.more}`}</button>}
          </>}
        </div>
        <button type="button" className="showroom-mobile-reset" onClick={resetView}>{copy.reset}</button>
      </div>
      {selectedHotspot && updatedComponents.has(selectedHotspot.componentId) && <section className="showroom-mobile-detail" aria-live="polite">
        <header><h2>{garageComponent(locale, selectedHotspot.id, selectedHotspot.label)}</h2><button type="button" onClick={() => selectPiece(selectedHotspot.componentId)} aria-label={copy.closeDetail}>×</button></header>
        <div className="showroom-mobile-detail__body">{renderUpdateDetails(updates.filter((update) => update.componentId === selectedHotspot.componentId))}</div>
      </section>}
      <aside className="showroom-panel" aria-label={copy.components}>
        <div className="showroom-panel__top"><p className="section-kicker">{copy.components}</p><span>{noUpdates ? copy.noSubmitted : `${updates.length.toString().padStart(2, '0')} ${copy.submitted}`}</span></div>
        <div className="showroom-pieces">
          {updatedHotspots.length > 0 && <section className="showroom-piece-group showroom-piece-group--updates"><h3>{copy.updated}</h3>{updatedHotspots.map(renderComponent)}</section>}
          {garageComponentGroups.map((group) => { const remaining = group.componentIds.map((id) => garageHotspots.find((hotspot) => hotspot.id === id)).filter((item): item is F1TechHotspot => item !== undefined).filter((item) => !updatedComponents.has(item.componentId)); return remaining.length > 0 && <section className="showroom-piece-group" key={group.id}><h3>{garageCategory(locale, group.id)}</h3>{remaining.map(renderComponent)}</section> })}
        </div>
      </aside>
      <div className="showroom__views" aria-label={copy.views}>{cameraPresets.map((preset) => <button type="button" className={cameraPreset === preset && !selectedComponent ? 'showroom-view showroom-view--active' : 'showroom-view'} key={preset} onClick={() => selectCamera(preset)}>{copy[preset === 'default' ? 'reset' : preset]}</button>)}</div><p className="showroom__hint">{copy.hint}</p>
      <div className="showroom-teambar showroom-teambar--desktop" aria-label={copy.teamSelector}>{garageTeams.map((item) => { const count = publishedUpdates.filter((update) => update.teamId === item.id && update.grandPrixId === grandPrix.id).length; return <button type="button" className={item.id === teamId ? 'showroom-team showroom-team--selected' : 'showroom-team'} key={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.theme.primary } as React.CSSProperties}><i /><span>{item.name}</span><em>{count ? `${count.toString().padStart(2, '0')} ${copy.submitted}` : copy.noSubmitted}</em></button> })}</div>
      <div className="showroom-team-mobile" aria-label={copy.teamSelector}>
        {garageTeams.map((item) => <button type="button" className={item.id === teamId ? 'showroom-team-mobile__item showroom-team-mobile__item--active' : 'showroom-team-mobile__item'} key={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.theme.primary } as React.CSSProperties} aria-label={item.name} aria-pressed={item.id === teamId}><i /><span>{teamAbbreviations[item.id]}</span></button>)}
      </div>
    </section>
  </section>
}
