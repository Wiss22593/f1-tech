import { useEffect, useRef, useState } from 'react'
import { getCarAssetForTeam, type CameraPresetId, type CarComponentId, type F1TechHotspot } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'
import { garageComponentGroups, garageGrandPrix, garageHotspots, garageTeams, getGarageUpdateContent, type GarageUpdate } from './data'
import { garageCategory, garageComponent, garageGrandPrixName, garageText, garageUpdateCount, uiText, type Locale } from '../../i18n'
import { loadPublishedGrandPrix, toCarComponent, publishedUpdateCounts } from '../../services/fia/published-dataset'
import { defaultSeason, seasonEvents, supportedSeasons } from '../../domain/calendar.mjs'
import { hasPublishedUpdates, selectPublishedGarageGrandPrix, showComponentSubtitle } from './presentation.mjs'

const cameraPresets: CameraPresetId[] = ['default', 'front', 'rear', 'side', 'top']
const teamAbbreviations: Record<string, string> = { mercedes: 'MER', ferrari: 'FER', mclaren: 'MCL', 'red-bull-racing': 'RBR', 'racing-bulls': 'RB', 'aston-martin': 'AST', alpine: 'ALP', haas: 'HAA', audi: 'AUD', williams: 'WIL', cadillac: 'CAD' }
const defaultGrandPrix = garageGrandPrix[0]
const withoutOrdinalPrefix = (text: string) => text.replace(/^\s*\d+[.)-]?\s+/, '')

async function findPublishedGrandPrix() {
  const published = new Set<string>()
  const events = await Promise.all(garageGrandPrix.map(async (event) => {
    const { dataset } = await loadPublishedGrandPrix(event.id, event.season)
    if (hasPublishedUpdates(dataset)) published.add(event.id)
    return dataset ? { ...event, startDate: dataset.grandPrix.startDate ?? event.startDate, endDate: dataset.grandPrix.endDate ?? event.endDate, circuit: dataset.grandPrix.circuit ?? event.circuit } : event
  }))
  return { published, events }
}

export function GaragePage({ locale }: { locale: Locale }) {
  const copy = garageText(locale)
  const [initialQuery] = useState(() => new URLSearchParams(window.location.search))
  const [season, setSeason] = useState(() => garageGrandPrix.find(event => event.id === initialQuery.get('gp'))?.season ?? defaultSeason(garageGrandPrix)!)
  const [publishedResolved, setPublishedResolved] = useState(false)
  const requestedSelection = useRef<{ season: number; gp: string | null }>({ season, gp: initialQuery.get('gp') })
  const [grandPrixId, setGrandPrixId] = useState('')
  const [teamId, setTeamId] = useState(() => garageTeams.some((item) => item.id === initialQuery.get('team')) ? initialQuery.get('team')! : garageTeams[0].id)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  const [selectedComponent, setSelectedComponent] = useState<CarComponentId>()
  const [selectedUpdateId, setSelectedUpdateId] = useState<string>()
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [publishedUpdates, setPublishedUpdates] = useState<GarageUpdate[]>([])
  const [resolvedGrandPrix, setResolvedGrandPrix] = useState(garageGrandPrix)
  const [publishedGrandPrixIds, setPublishedGrandPrixIds] = useState<ReadonlySet<string>>(() => new Set())
  const [mobileUpdatesExpanded, setMobileUpdatesExpanded] = useState(false)
  const itemRefs = useRef<Partial<Record<CarComponentId, HTMLDivElement | null>>>({})
  const grandPrix = resolvedGrandPrix.find((item) => item.id === grandPrixId) ?? defaultGrandPrix
  const selectableGrandPrix = seasonEvents(resolvedGrandPrix, season)
  const seasons = supportedSeasons(garageGrandPrix)
  const team = garageTeams.find((item) => item.id === teamId) ?? garageTeams[0]
  const carAsset = getCarAssetForTeam(team.id)
  const updates = publishedUpdates.filter((update) => update.teamId === team.id && update.grandPrixId === grandPrix.id)
  const updateCounts = publishedUpdateCounts(publishedUpdates.flatMap(update => update.fiaRecord ? [update.fiaRecord] : []), grandPrix.id)
  const noUpdates = updates.length === 0
  const updatedComponents = new Set(updates.flatMap((update) => update.componentId ? [update.componentId] : []))
  const updatedHotspots = garageHotspots.filter((hotspot, index, all) => updatedComponents.has(hotspot.componentId) && all.findIndex((item) => item.componentId === hotspot.componentId) === index)
  const nonVisualizableUpdates = updates.filter((update) => !update.componentId)
  const selectedHotspot = garageHotspots.find((hotspot) => hotspot.componentId === selectedComponent)
  const selectedUpdate = updates.find((update) => update.id === selectedUpdateId)
  const selectedMobileContent = selectedUpdate ? getGarageUpdateContent(selectedUpdate, locale) : null
  const mobileUpdateLimit = 3
  const mobileUpdates = mobileUpdatesExpanded ? updates : updates.slice(0, mobileUpdateLimit)
  const hiddenMobileUpdates = Math.max(updates.length - mobileUpdateLimit, 0)

  useEffect(() => {
    let active = true
    void findPublishedGrandPrix().then(({ published, events }) => {
      if (!active) return
      setPublishedGrandPrixIds(published)
      setResolvedGrandPrix(events)
      const id = selectPublishedGarageGrandPrix(events, published, requestedSelection.current.season, requestedSelection.current.gp)
      setGrandPrixId(id ?? '')
      setPublishedResolved(true)
    })
    return () => { active = false }
  }, [initialQuery])
  useEffect(() => {
    if (!publishedResolved) return
    const query = new URLSearchParams(window.location.search)
    if (grandPrixId) query.set('gp', grandPrixId); else query.delete('gp')
    query.set('team', teamId)
    window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`)
  }, [grandPrixId, teamId, publishedResolved])
  useEffect(() => {
    if (window.matchMedia('(max-width: 600px)').matches) return
    if (selectedComponent) itemRefs.current[selectedComponent]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedComponent])
  useEffect(() => {
    let active = true
    setPublishedUpdates([])
    if (!publishedResolved || !publishedGrandPrixIds.has(grandPrixId)) return
    void loadPublishedGrandPrix(grandPrixId, season).then(({ dataset }) => {
      if (!active) return
      setPublishedUpdates((dataset?.updates ?? []).map((record) => {
        const componentId = record.visualizable === false ? null : toCarComponent(record.componentId)
        return { fiaRecord: record, id: record.id, teamId: record.teamId, grandPrixId: record.grandPrixId, componentId, visualizable: Boolean(componentId), status: 'SUBMITTED', presentedComponent: record.componentName ?? null, primaryReason: record.primaryReason ?? record.category, geometricDifference: record.geometricDifference ?? null, description: record.briefDescription ?? record.description ?? record.sourceText, source: { type: 'FIA', label: 'FIA Car Presentation Submission', document: record.sourceDocument, date: record.publishedAt }, confidence: 'CONFIRMED', magnitude: (record.magnitude ?? '') as GarageUpdate['magnitude'], objective: record.objective ?? '', area: record.area ?? '' }
      }))
    })
    return () => { active = false }
  }, [grandPrixId, season, publishedResolved, publishedGrandPrixIds])
  function resetView() { setSelectedComponent(undefined); setSelectedUpdateId(undefined); setCameraPreset('default'); setFocusRequestId((value) => value + 1); setMobileUpdatesExpanded(false) }
  function selectPiece(componentId: CarComponentId) {
    const selecting = selectedComponent !== componentId
    setSelectedComponent(selecting ? componentId : undefined)
    setSelectedUpdateId(selecting ? updates.find((update) => update.componentId === componentId)?.id : undefined)
    setCameraPreset('default'); setFocusRequestId((value) => value + 1)
  }
  function selectUpdate(update: GarageUpdate) {
    const selecting = selectedUpdateId !== update.id
    setSelectedUpdateId(selecting ? update.id : undefined)
    if (!update.componentId) return
    setSelectedComponent(selecting ? update.componentId : undefined)
    setCameraPreset('default'); setFocusRequestId((value) => value + 1)
  }
  function changeSeason(year: number) { requestedSelection.current = { season: year, gp: null }; setSeason(year); setGrandPrixId(selectPublishedGarageGrandPrix(resolvedGrandPrix, publishedGrandPrixIds, year) ?? ''); resetView() }
  function changeGrandPrix(id: string) { if (!publishedGrandPrixIds.has(id) || !selectableGrandPrix.some(event => event.id === id)) return; requestedSelection.current = { season, gp: id }; setGrandPrixId(id); resetView() }
  function changeTeam(id: string) { setTeamId(id); resetView() }
  function selectCamera(preset: CameraPresetId) { if (preset === 'default') resetView(); else { setCameraPreset(preset); setSelectedComponent(undefined) } }
  function renderTeamCount(count: number) {
    const label = garageUpdateCount(locale, count)
    return <em className={count === 0 ? 'showroom-team-count showroom-team-count--empty' : 'showroom-team-count'}>{count > 0 ? <><strong>{count}</strong>{' '}<span>{label.slice(String(count).length + 1)}</span></> : <span>{label}</span>}</em>
  }
  function renderUpdateDetails(componentUpdates: GarageUpdate[], title: string) {
    return componentUpdates.length === 0 ? <p>{copy.noUpdate}</p> : componentUpdates.map((update) => {
      const content = getGarageUpdateContent(update, locale)
      return <article className="showroom-submission" key={update.id}>
        {showComponentSubtitle(title, content.presentedComponent) && <h3>{content.presentedComponent}</h3>}
        {content.primaryReason && <p className="showroom-submission__reason">{content.primaryReason}</p>}
        {content.geometricDifference && <p className="showroom-submission__geometry">{content.geometricDifference}</p>}
        {content.description && <p className="showroom-submission__description">{content.description}</p>}
      </article>
    })
  }
  function renderMobileUpdateDetails(componentUpdates: GarageUpdate[]) {
    return componentUpdates.map((update) => {
      const content = getGarageUpdateContent(update, locale)
      const description = content.description ?? content.geometricDifference
      return description && <article className="showroom-submission" key={update.id}>
        {locale === 'es' && content.primaryReason && <p className="showroom-submission__reason">{content.primaryReason}</p>}
        {locale === 'es' && content.geometricDifference && <p className="showroom-submission__geometry">{content.geometricDifference}</p>}
        <p className="showroom-submission__description">{withoutOrdinalPrefix(description)}</p>
      </article>
    })
  }
  function renderComponent(hotspot: F1TechHotspot) {
    const componentUpdates = updates.filter((update) => update.componentId === hotspot.componentId)
    const expanded = componentUpdates.some((update) => update.id === selectedUpdateId)
    return <div className={`showroom-component${expanded ? ' showroom-component--expanded' : ''}`} key={hotspot.id} ref={(node) => { itemRefs.current[hotspot.componentId] = node }}>
      <button type="button" className={`showroom-piece${expanded ? ' showroom-piece--selected' : ''}${componentUpdates.length ? ' showroom-piece--active' : ''}`} onClick={() => selectPiece(hotspot.componentId)} aria-expanded={expanded}>
        <i /><span>{garageComponent(locale, hotspot.id, hotspot.label)}</span>{componentUpdates.length > 0 && <em>● {copy.updated}</em>}<b aria-hidden="true">{expanded ? '−' : '+'}</b>
      </button>
      {expanded && <div className="showroom-inline-detail" aria-live="polite">{renderUpdateDetails(componentUpdates, garageComponent(locale, hotspot.id, hotspot.label))}</div>}
    </div>
  }
  function renderTextOnlyUpdate(update: GarageUpdate) {
    const expanded = selectedUpdateId === update.id
    const content = getGarageUpdateContent(update, locale)
    return <div className={`showroom-component${expanded ? ' showroom-component--expanded' : ''}`} key={update.id}>
      <button type="button" className={`showroom-piece showroom-piece--active${expanded ? ' showroom-piece--selected' : ''}`} onClick={() => selectUpdate(update)} aria-expanded={expanded}>
        <i /><span>{content.presentedComponent ?? update.presentedComponent}</span><em>● {copy.updated}</em><b aria-hidden="true">{expanded ? '−' : '+'}</b>
      </button>
      {expanded && <div className="showroom-inline-detail" aria-live="polite">{renderUpdateDetails([update], content.presentedComponent ?? update.presentedComponent ?? '')}</div>}
    </div>
  }

  return <section className="showroom" style={{ '--team-primary': team.theme.primary, '--team-accent': team.theme.accent, '--team-surface': team.theme.surface } as React.CSSProperties} aria-labelledby="showroom-title">
    <section className="showroom__stage">
      <div className="showroom__heading"><h1 id="showroom-title">F1 TECH<span>.</span></h1></div>
      <div className="showroom__context"><label className="sr-only" htmlFor="grand-prix-selector">{copy.grandPrix}</label><div className="showroom__selectors"><label className="sr-only" htmlFor="season-selector">{copy.season}</label><span className="showroom-gp-select showroom-season-select"><select id="season-selector" value={season} onChange={(event) => changeSeason(Number(event.target.value))}>{seasons.map(year => <option key={year} value={year}>{year}</option>)}</select></span><span className="showroom-gp-select"><select id="grand-prix-selector" value={grandPrixId} disabled={!publishedResolved} onChange={(event) => changeGrandPrix(event.target.value)}>{!grandPrixId && <option value="" disabled>{copy.noPublished}</option>}{selectableGrandPrix.map((item) => <option key={item.id} value={item.id} disabled={!publishedGrandPrixIds.has(item.id)}>{garageGrandPrixName(locale, item.id, item.name)}</option>)}</select></span></div><strong>{team.name.toUpperCase()}</strong><span>{grandPrixId ? grandPrix.circuit : null}</span></div>
      <div className="showroom__canvas"><ModelViewer asset={carAsset} locale={locale} cameraPreset={cameraPreset} theme={team.theme} hotspots={garageHotspots} activeComponents={[...updatedComponents]} selectedComponent={selectedUpdate && !selectedUpdate.componentId ? undefined : selectedComponent} selectedHotspot={selectedHotspot} focusRequestId={focusRequestId} showCallouts={false} onSelectComponent={selectPiece} /><button type="button" className="showroom-mobile-reset" onClick={resetView}>{copy.reset}</button></div>
      <div className="showroom-mobile-toolbar">
        <div className={`showroom-mobile-updates${mobileUpdatesExpanded ? ' showroom-mobile-updates--expanded' : ''}`} aria-label={uiText(locale, 'updatesTitle')}>
          <h2>{uiText(locale, 'updatesTitle')}</h2>
          {noUpdates ? <p className="showroom-mobile-updates__empty">{copy.noPublished}</p> : <>
            <div className="showroom-mobile-updates__list">{mobileUpdates.map((update) => { const content = getGarageUpdateContent(update, locale); return <button type="button" className={selectedUpdateId === update.id ? 'showroom-mobile-chip showroom-mobile-chip--selected' : 'showroom-mobile-chip'} key={update.id} onClick={() => selectUpdate(update)} aria-pressed={selectedUpdateId === update.id}><i />{withoutOrdinalPrefix(content.presentedComponent ?? update.presentedComponent ?? '')}</button> })}</div>
            {hiddenMobileUpdates > 0 && <button type="button" className="showroom-mobile-updates__more" onClick={() => setMobileUpdatesExpanded((expanded) => !expanded)} aria-expanded={mobileUpdatesExpanded}>{mobileUpdatesExpanded ? '−' : `+${hiddenMobileUpdates} ${copy.more}`}</button>}
          </>}
        </div>
      </div>
      {selectedUpdate && <section className="showroom-mobile-detail" aria-live="polite">
        <header><h2>{withoutOrdinalPrefix(selectedMobileContent?.presentedComponent ?? selectedUpdate.presentedComponent ?? '')}</h2><button type="button" onClick={() => selectUpdate(selectedUpdate)} aria-label={copy.closeDetail}>×</button></header>
        <div className="showroom-mobile-detail__body">{renderMobileUpdateDetails([selectedUpdate])}</div>
      </section>}
      <aside className="showroom-panel" aria-label={copy.components}>
        <div className="showroom-panel__top"><p className="section-kicker">{copy.components}</p><span>{garageUpdateCount(locale, updateCounts[team.id] ?? 0)}</span></div>
        <div className="showroom-pieces">
          {(updatedHotspots.length > 0 || nonVisualizableUpdates.length > 0) && <section className="showroom-piece-group showroom-piece-group--updates"><h3>{copy.updated}</h3>{updatedHotspots.map(renderComponent)}{nonVisualizableUpdates.map(renderTextOnlyUpdate)}</section>}
          {garageComponentGroups.map((group) => { const remaining = group.componentIds.map((id) => garageHotspots.find((hotspot) => hotspot.id === id)).filter((item): item is F1TechHotspot => item !== undefined).filter((item) => !updatedComponents.has(item.componentId)); return remaining.length > 0 && <section className="showroom-piece-group" key={group.id}><h3>{garageCategory(locale, group.id)}</h3>{remaining.map(renderComponent)}</section> })}
        </div>
      </aside>
      <div className="showroom__views" aria-label={copy.views}>{cameraPresets.map((preset) => <button type="button" className={cameraPreset === preset && !selectedComponent ? 'showroom-view showroom-view--active' : 'showroom-view'} key={preset} onClick={() => selectCamera(preset)}>{copy[preset === 'default' ? 'reset' : preset]}</button>)}</div><p className="showroom__hint">{copy.hint}</p>
      <div className="showroom-teambar showroom-teambar--desktop" aria-label={copy.teamSelector}>{garageTeams.map((item) => { const count = updateCounts[item.id] ?? 0; return <button type="button" className={item.id === teamId ? 'showroom-team showroom-team--selected' : 'showroom-team'} key={item.id} data-team={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.theme.primary } as React.CSSProperties} aria-pressed={item.id === teamId} aria-label={`${item.name}, ${garageUpdateCount(locale, count)}`}><i /><span className="showroom-team-name">{item.name}</span>{renderTeamCount(count)}</button> })}</div>
      <div className="showroom-team-mobile" aria-label={copy.teamSelector}>
        {garageTeams.map((item) => <button type="button" className={item.id === teamId ? 'showroom-team-mobile__item showroom-team-mobile__item--active' : 'showroom-team-mobile__item'} key={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.theme.primary } as React.CSSProperties} aria-label={`${item.name}, ${garageUpdateCount(locale, updateCounts[item.id] ?? 0)}`} aria-pressed={item.id === teamId}><i /><span className="showroom-team-name">{teamAbbreviations[item.id]}</span>{renderTeamCount(updateCounts[item.id] ?? 0)}</button>)}
      </div>
    </section>
  </section>
}
