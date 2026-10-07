import { useEffect, useMemo, useRef, useState } from 'react'
import { getCarAssetForTeam, type CameraPresetId, type CarComponentId, type F1TechHotspot } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'
import { garageComponentGroups, garageGrandPrix, garageHotspots, garageTeams, getGarageUpdateContent, type GarageUpdate } from './data'
import { garageCategory, garageComponent, garageGrandPrixName, garageText, garageUpdateCount, type Locale } from '../../i18n'
import { loadPublishedGrandPrix, toCarComponent, publishedUpdateCounts } from '../../services/fia/published-dataset'
import { defaultSeason, seasonEvents, supportedSeasons } from '../../domain/calendar.mjs'
import { hasPublishedUpdates, quickUpdateFamilies, prepareFamilyDetails, selectPublishedGarageGrandPrix, showComponentSubtitle, shortGrandPrixLabel } from './presentation.mjs'

import { getDriverAsset, getShowroomDriver, isDriverAvailable, showroomLabels, showroomTeams, orderedDrivers } from './showroom'

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
  const [driversByTeam, setDriversByTeam] = useState<Record<string, string>>(() => ({ [teamId]: getShowroomDriver(teamId, initialQuery.get('driver')).id }))
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  const [selectedComponent, setSelectedComponent] = useState<CarComponentId>()
  const [selectedUpdateId, setSelectedUpdateId] = useState<string>()
  const [focusFromUpdate, setFocusFromUpdate] = useState(false)
  const [focusRequestId, setFocusRequestId] = useState(0)
  const [publishedUpdates, setPublishedUpdates] = useState<GarageUpdate[]>([])
  const [resolvedGrandPrix, setResolvedGrandPrix] = useState(garageGrandPrix)
  const [publishedGrandPrixIds, setPublishedGrandPrixIds] = useState<ReadonlySet<string>>(() => new Set())
  const [mobileComponentsOpen, setMobileComponentsOpen] = useState(false)
  const itemRefs = useRef<Partial<Record<CarComponentId, HTMLDivElement | null>>>({})
  const grandPrix = resolvedGrandPrix.find((item) => item.id === grandPrixId) ?? defaultGrandPrix
  const selectableGrandPrix = seasonEvents(resolvedGrandPrix, season)
  const seasons = supportedSeasons(garageGrandPrix)
  const team = garageTeams.find((item) => item.id === teamId) ?? garageTeams[0]
  const showroomTeam = showroomTeams[team.id]
  const driver = getShowroomDriver(team.id, driversByTeam[team.id])
  const carAsset = useMemo(() => getDriverAsset(getCarAssetForTeam(team.id), driver), [team.id, driver])
  const driverCopy = showroomLabels[locale]
  const updates = publishedUpdates.filter((update) => update.teamId === team.id && update.grandPrixId === grandPrix.id)
  const updateCounts = publishedUpdateCounts(publishedUpdates.flatMap(update => update.fiaRecord ? [update.fiaRecord] : []), grandPrix.id)
  const updatedComponents = new Set(updates.flatMap((update) => update.componentId ? [update.componentId] : []))
  const updatedHotspots = garageHotspots.filter((hotspot, index, all) => updatedComponents.has(hotspot.componentId) && all.findIndex((item) => item.componentId === hotspot.componentId) === index)
  const quickFamilies = quickUpdateFamilies(updates)
  const nonVisualizableUpdates = updates.filter((update) => !update.componentId)
  const selectedHotspot = garageHotspots.find((hotspot) => hotspot.componentId === selectedComponent)
  const selectedUpdate = updates.find((update) => update.id === selectedUpdateId)
  const selectedMobileContent = selectedUpdate ? getGarageUpdateContent(selectedUpdate, locale) : null

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
    // Keep automatic selection automatic on reload; explicit historical links remain stable.
    if (grandPrixId && requestedSelection.current.gp) query.set('gp', grandPrixId); else query.delete('gp')
    query.set('team', teamId)
    query.set('driver', driver.id)
    window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`)
  }, [grandPrixId, teamId, driver.id, publishedResolved])
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
  useEffect(() => { setSelectedComponent(undefined); setSelectedUpdateId(undefined); setFocusRequestId(value => value + 1) }, [locale])
  function resetView() { setFocusFromUpdate(false); setSelectedComponent(undefined); setSelectedUpdateId(undefined); setCameraPreset('default'); setFocusRequestId((value) => value + 1) }
  function selectPiece(componentId: CarComponentId) {
    setFocusFromUpdate(false)
    const selecting = selectedComponent !== componentId
    setSelectedComponent(selecting ? componentId : undefined)
    setSelectedUpdateId(selecting ? updates.find((update) => update.componentId === componentId)?.id : undefined)
    setCameraPreset('default'); setFocusRequestId((value) => value + 1)
  }
  function selectUpdate(update: GarageUpdate) {
    setFocusFromUpdate(true)
    const selecting = selectedUpdateId !== update.id
    setSelectedUpdateId(selecting ? update.id : undefined)
    if (!update.componentId) { setSelectedComponent(undefined); setCameraPreset('default'); setFocusRequestId((value) => value + 1); return }
    setSelectedComponent(selecting ? update.componentId : undefined)
    setCameraPreset('default'); setFocusRequestId((value) => value + 1)
  }
  function changeSeason(year: number) { requestedSelection.current = { season: year, gp: null }; setSeason(year); setGrandPrixId(selectPublishedGarageGrandPrix(resolvedGrandPrix, publishedGrandPrixIds, year) ?? ''); resetView() }
  function changeGrandPrix(id: string) { if (!publishedGrandPrixIds.has(id) || !selectableGrandPrix.some(event => event.id === id)) return; requestedSelection.current = { season, gp: id }; setGrandPrixId(id); resetView() }
  function changeDriver(id: string) {
    if (id === driver.id || !showroomTeam.drivers.some(item => item.id === id && isDriverAvailable(item))) return
    setDriversByTeam(current => ({ ...current, [team.id]: id }))
    resetView()
  }
  function changeTeam(id: string) { setTeamId(id); resetView() }
  function selectCamera(preset: CameraPresetId) { if (preset === 'default') resetView(); else { setCameraPreset(preset); setSelectedComponent(undefined); setSelectedUpdateId(undefined); setFocusRequestId(value => value + 1) } }
  function renderTeamCount(count: number) {
    const label = garageUpdateCount(locale, count)
    return <em className={count === 0 ? 'showroom-team-count showroom-team-count--empty' : 'showroom-team-count'}>{count > 0 ? <><strong>{count}</strong>{' '}<span>{label.slice(String(count).length + 1)}</span></> : <span>{label}</span>}</em>
  }
  function renderUpdateDetails(componentUpdates: GarageUpdate[], title: string) {
    if (componentUpdates.length === 0) return null
    const { rows, shared } = prepareFamilyDetails(componentUpdates, update => getGarageUpdateContent(update, locale))
    const updateLabel = { es: 'Actualización', en: 'Update', it: 'Aggiornamento', pt: 'Atualização', fr: 'Mise à jour', de: 'Aktualisierung' }[locale]
    const fieldLabels = {
      es: ['Razón primaria', 'Diferencia geométrica', 'Descripción breve'],
      en: ['Primary reason', 'Geometric difference', 'Brief description'],
      it: ['Motivo principale', 'Differenza geometrica', 'Breve descrizione'],
      pt: ['Razão principal', 'Diferença geométrica', 'Descrição breve'],
      fr: ['Raison principale', 'Différence géométrique', 'Brève description'],
      de: ['Hauptgrund', 'Geometrischer Unterschied', 'Kurzbeschreibung'],
    }[locale]
    const renderField = (field: 'primaryReason' | 'geometricDifference' | 'description', value: string) => <div className="showroom-submission__field">
      <span className="showroom-submission__label">{fieldLabels[['primaryReason', 'geometricDifference', 'description'].indexOf(field)]}</span>
      <p className={`showroom-submission__${fieldClass[field]}`}>{value}</p>
    </div>
    const fieldClass = { primaryReason: 'reason', geometricDifference: 'geometry', description: 'description' }
    return <>
      {rows.map(({ update, number, content, specific }) => <article className="showroom-submission" key={update.id}>
        {(rows.length > 1 || showComponentSubtitle(title, content.presentedComponent)) && <h3 className="showroom-submission__heading">{rows.length > 1 && <span className="showroom-submission__number">{number}</span>}<span>{content.presentedComponent ?? title}</span></h3>}
        {specific.primaryReason && renderField('primaryReason', specific.primaryReason)}
        {specific.geometricDifference && renderField('geometricDifference', specific.geometricDifference)}
        {specific.description && renderField('description', specific.description)}
      </article>)}
      {shared.length > 0 && <div className="showroom-submission showroom-submission--shared">
        {shared.map(({ field, value, numbers }, index) => <div key={index}>
          {numbers.length < rows.length && <span className="showroom-submission__ordinal">{updateLabel} {numbers.join(', ')}</span>}
          {renderField(field, value)}
        </div>)}
      </div>}
    </>
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
    const selected = selectedComponent === hotspot.componentId
    const expanded = selected && componentUpdates.length > 0
    return <div className={`showroom-component${expanded ? ' showroom-component--expanded' : ''}`} key={hotspot.id} ref={(node) => { itemRefs.current[hotspot.componentId] = node }}>
      <button type="button" className={`showroom-piece${selected ? ' showroom-piece--selected' : ''}${componentUpdates.length ? ' showroom-piece--active' : ''}`} onClick={() => selectPiece(hotspot.componentId)} aria-pressed={selected} aria-expanded={componentUpdates.length ? expanded : undefined}>
        <i /><span>{garageComponent(locale, hotspot.id, hotspot.label)}</span>{componentUpdates.length > 0 && <em>● {copy.updated}</em>}{componentUpdates.length > 0 && <b aria-hidden="true">{expanded ? '−' : '+'}</b>}
      </button>
      {expanded && componentUpdates.length > 0 && <div className="showroom-inline-detail" aria-live="polite">{renderUpdateDetails(componentUpdates, garageComponent(locale, hotspot.id, hotspot.label))}</div>}
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
      <div className="showroom-mobile-header"><div className="showroom__heading"><p className="showroom__eyebrow">Formula Tech <span> / {season}</span></p><div className="showroom__identity"><h1 id="showroom-title">{team.name}</h1><p className="showroom__model">{showroomTeam.carName}<span>{garageUpdateCount(locale, updateCounts[team.id] ?? 0)}</span></p></div><span className="showroom-mobile-count">{garageUpdateCount(locale, updateCounts[team.id] ?? 0)}</span><div className="showroom-drivers" role="group" aria-label={driverCopy.driver}>{orderedDrivers(showroomTeam).map(item => <button type="button" key={item.id} disabled={!isDriverAvailable(item)} aria-pressed={driver.id === item.id} title={item.name} onClick={() => changeDriver(item.id)}><span>{item.number !== null && <><b className="showroom-driver-number">{item.number}</b>{' '}</>}{item.shortName}</span>{!isDriverAvailable(item) && <small>{driverCopy.soon}</small>}</button>)}</div><p className="showroom__driver-name">{driver.name}</p></div>
      <div className="showroom__context"><label className="sr-only" htmlFor="grand-prix-selector">{copy.grandPrix}</label><div className="showroom__selectors"><label className="sr-only" htmlFor="season-selector">{copy.season}</label><span className="showroom-gp-select showroom-season-select"><select id="season-selector" value={season} onChange={(event) => changeSeason(Number(event.target.value))}>{seasons.map(year => <option key={year} value={year}>{year}</option>)}</select></span><span className="showroom-gp-select showroom-race-select"><span className="showroom-gp-short" aria-hidden="true">{grandPrixId ? shortGrandPrixLabel(garageGrandPrixName(locale, grandPrix.id, grandPrix.name)).toLocaleLowerCase(locale) : copy.noPublished}</span><select id="grand-prix-selector" value={grandPrixId} disabled={!publishedResolved} onChange={(event) => changeGrandPrix(event.target.value)}>{!grandPrixId && <option value="" disabled>{copy.noPublished}</option>}{selectableGrandPrix.map((item) => <option key={item.id} value={item.id} disabled={!publishedGrandPrixIds.has(item.id)}>{garageGrandPrixName(locale, item.id, item.name)}</option>)}</select></span></div><strong>{team.name.toUpperCase()}</strong><span>{grandPrixId ? grandPrix.circuit : null}</span></div>
      </div>

      <div className="showroom__canvas"><ModelViewer asset={carAsset} locale={locale} cameraPreset={cameraPreset} theme={team.theme} hotspots={garageHotspots} activeComponents={[...updatedComponents]} selectedComponent={selectedUpdate && !selectedUpdate.componentId ? undefined : selectedComponent} selectedComponentName={focusFromUpdate ? selectedUpdate?.fiaRecord?.componentName ?? selectedUpdate?.presentedComponent : undefined} selectedHotspot={selectedHotspot} focusRequestId={focusRequestId} showCallouts={false} presentationScale={1.12} onSelectComponent={selectPiece} /><button type="button" className="showroom-mobile-reset" onClick={resetView}>{copy.reset}</button></div>
      <div className="showroom-mobile-toolbar" role="group" aria-label={copy.components}>
        <button type="button" className="showroom-components-toggle" aria-expanded={mobileComponentsOpen} aria-controls="showroom-components" onClick={() => setMobileComponentsOpen(open => !open)}>{mobileComponentsOpen ? '× ' : ''}{copy.components}</button>
        <div className="showroom-mobile-updates__list">{quickFamilies.map(update => {
          const hotspot = garageHotspots.find(item => item.componentId === update.componentId)
          const selected = hotspot ? selectedComponent === hotspot.componentId : selectedUpdateId === update.id
          return <button type="button" className={selected ? 'showroom-mobile-chip showroom-mobile-chip--selected' : 'showroom-mobile-chip'} key={update.componentId ?? update.id} onClick={() => { if (hotspot) selectPiece(hotspot.componentId); else selectUpdate(update); setMobileComponentsOpen(true) }} aria-pressed={selected}><i />{hotspot ? garageComponent(locale, hotspot.id, hotspot.label) : getGarageUpdateContent(update, locale).presentedComponent ?? update.presentedComponent}</button>
        })}</div>
      </div>
      {mobileComponentsOpen && selectedUpdate && <section className="showroom-mobile-detail" aria-live="polite">
        <header><h2>{withoutOrdinalPrefix(selectedMobileContent?.presentedComponent ?? selectedUpdate.presentedComponent ?? '')}</h2><button type="button" onClick={() => selectUpdate(selectedUpdate)} aria-label={copy.closeDetail}>×</button></header>
        <div className="showroom-mobile-detail__body">{renderMobileUpdateDetails([selectedUpdate])}</div>
      </section>}

      <aside id="showroom-components" className={`showroom-panel${mobileComponentsOpen ? ' showroom-panel--mobile-open' : ''}`} aria-label={copy.components}>
        <div className="showroom-panel__top"><p className="section-kicker">{copy.components}</p><span>{garageUpdateCount(locale, updateCounts[team.id] ?? 0)}</span></div>
        <div className="showroom-pieces">
          {(updatedHotspots.length > 0 || nonVisualizableUpdates.length > 0) && <section className="showroom-piece-group showroom-piece-group--updates"><h3>{copy.updated}</h3>{updatedHotspots.map(renderComponent)}{nonVisualizableUpdates.map(renderTextOnlyUpdate)}</section>}
          {garageComponentGroups.map((group) => { const remaining = group.componentIds.map((id) => garageHotspots.find((hotspot) => hotspot.id === id)).filter((item): item is F1TechHotspot => item !== undefined).filter((item) => !updatedComponents.has(item.componentId)); return remaining.length > 0 && <section className="showroom-piece-group" key={group.id}><h3>{garageCategory(locale, group.id)}</h3>{remaining.map(renderComponent)}</section> })}
        </div>
      </aside>
      <div className="showroom__views" aria-label={copy.views}>{cameraPresets.map((preset) => <button type="button" className={cameraPreset === preset && !selectedComponent ? 'showroom-view showroom-view--active' : 'showroom-view'} key={preset} onClick={() => selectCamera(preset)}>{copy[preset === 'default' ? 'reset' : preset]}</button>)}</div>
      <div className="showroom-teambar showroom-teambar--desktop" aria-label={copy.teamSelector}>{garageTeams.map((item) => { const count = updateCounts[item.id] ?? 0; return <button type="button" className={item.id === teamId ? 'showroom-team showroom-team--selected' : 'showroom-team'} key={item.id} data-team={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.teamAccentColor } as React.CSSProperties} aria-pressed={item.id === teamId} aria-label={`${item.name}, ${garageUpdateCount(locale, count)}`}><i /><span className="showroom-team-name">{item.name}</span>{renderTeamCount(count)}</button> })}</div>
      <div className="showroom-team-mobile" aria-label={copy.teamSelector}>
        {garageTeams.map((item) => <button type="button" className={item.id === teamId ? 'showroom-team-mobile__item showroom-team-mobile__item--active' : 'showroom-team-mobile__item'} key={item.id} onClick={() => changeTeam(item.id)} style={{ '--item-primary': item.teamAccentColor } as React.CSSProperties} aria-label={`${item.name}, ${garageUpdateCount(locale, updateCounts[item.id] ?? 0)}`} aria-pressed={item.id === teamId}><i /><span className="showroom-team-name">{teamAbbreviations[item.id]}</span>{renderTeamCount(updateCounts[item.id] ?? 0)}</button>)}
      </div>
    </section>
  </section>
}
