import { useState } from 'react'
import { activeCarAsset, type CameraPresetId, type CarComponentId } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'
import { garageGrandPrix, garageHotspots, garageTeams, getGarageUpdates } from './data'

const cameraPresets: { id: CameraPresetId; label: string }[] = [{ id: 'default', label: 'RESET' }, { id: 'front', label: 'FRONTAL' }, { id: 'rear', label: 'TRASERA' }, { id: 'side', label: 'LATERAL' }, { id: 'top', label: 'SUPERIOR' }]

export function GaragePage() {
  const [grandPrixId, setGrandPrixId] = useState(garageGrandPrix[0].id)
  const [teamId, setTeamId] = useState(garageTeams[0].id)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  const [viewerVersion, setViewerVersion] = useState(0)
  const [selectedComponent, setSelectedComponent] = useState<CarComponentId | undefined>('floor')
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | undefined>()
  const grandPrix = garageGrandPrix.find((item) => item.id === grandPrixId) ?? garageGrandPrix[0]
  const team = garageTeams.find((item) => item.id === teamId) ?? garageTeams[0]
  const updates = getGarageUpdates(team.id, grandPrix.id)
  const zoneUpdates = updates.filter((update) => update.componentId === selectedComponent)
  const selectedUpdate = updates.find((update) => update.id === selectedUpdateId) ?? zoneUpdates[0]

  function selectTeam(nextTeamId: string) {
    setTeamId(nextTeamId); setSelectedComponent(undefined); setSelectedUpdateId(undefined)
  }
  function selectZone(componentId: CarComponentId) {
    setSelectedComponent(componentId); setSelectedUpdateId(undefined)
  }
  function selectCamera(preset: CameraPresetId) {
    setCameraPreset(preset); setViewerVersion((version) => version + 1)
  }

  return <section className="garage-page dashboard__content" style={{ '--team-primary': team.theme.primary, '--team-accent': team.theme.accent, '--team-surface': team.theme.surface } as React.CSSProperties} aria-labelledby="garage-title">
    <div className="garage-page__intro"><div><p className="section-kicker">VISUALIZACIÓN TÉCNICA · ENTORNO DEMO</p><h1 id="garage-title">3D Garage<span>.</span></h1><p>Seleccioná un Grand Prix y un equipo para ubicar cada señal de desarrollo sobre un auto provisional de F1 TECH.</p></div><span>ORBIT<br /><i>CONTROLS</i></span></div>
    <p className="demo-notice"><b>GARAGE V1 · DEMO</b>El coche es una representación geométrica provisional y original de F1 TECH. No incluye modelos, logos, liveries, texturas ni assets de terceros.</p>

    <section className="garage-context card" aria-label="Contexto del Garage">
      <label>GRAND PRIX<select value={grandPrixId} onChange={(event) => setGrandPrixId(event.target.value)}>{garageGrandPrix.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.circuit}</option>)}</select></label>
      <label>EQUIPO<select value={teamId} onChange={(event) => selectTeam(event.target.value)}>{garageTeams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="garage-context__team"><i /><span>PALETA F1 TECH</span><strong>{team.name}</strong></div>
      <div className="garage-context__count"><span>UPDATES PARA EL GP</span><strong>{updates.length.toString().padStart(2, '0')} <em>DEMO</em></strong></div>
    </section>

    <div className="garage-page__layout"><section className="garage-viewer card"><div className="garage-viewer__top"><span>F1 TECH · PROVISIONAL 3D MODEL</span><span>{activeCarAsset ? 'ORIGINAL ASSET REGISTRADO' : 'GEOMETRÍA DEMO ACTIVA'}</span></div><div className="garage-viewer__canvas"><ModelViewer key={`${cameraPreset}-${viewerVersion}`} asset={activeCarAsset} cameraPreset={cameraPreset} theme={team.theme} hotspots={garageHotspots} activeComponents={updates.map((update) => update.componentId)} selectedComponent={selectedComponent} onSelectComponent={selectZone} /></div><div className="garage-viewer__legend"><i /> HOTSPOT CON ACTIVIDAD <span>{updates.length} UPDATE{updates.length === 1 ? '' : 'S'} DEMO</span></div></section>
      <aside className="garage-inspector card"><p className="section-kicker">ZONA SELECCIONADA</p><h2>{garageHotspots.find((hotspot) => hotspot.componentId === selectedComponent)?.label ?? 'Seleccioná un hotspot'}</h2><p>{zoneUpdates.length ? `${zoneUpdates.length} actualización DEMO disponible en esta zona.` : 'Esta zona está disponible para análisis; no tiene una actualización DEMO para este equipo y GP.'}</p><div className="garage-zone-updates">{zoneUpdates.map((update) => <button type="button" className={selectedUpdate?.id === update.id ? 'garage-update-chip garage-update-chip--active' : 'garage-update-chip'} key={update.id} onClick={() => setSelectedUpdateId(update.id)}><span className={`status status--${update.status.toLowerCase().replace('_', '-')}`}>{update.status.replace('_', ' ')}</span><b>{update.objective}</b></button>)}</div><div className="garage-inspector__readout"><span>MODELO ACTIVO</span><strong>{activeCarAsset?.id ?? 'F1 TECH DEMO CAR V1'}</strong></div></aside></div>

    <section className="garage-controls" aria-label="Vistas de cámara">{cameraPresets.map((preset) => <button type="button" className={preset.id === cameraPreset ? 'garage-controls__item garage-controls__item--active' : 'garage-controls__item'} key={preset.id} onClick={() => selectCamera(preset.id)}><span>CAMERA PRESET</span><b>{preset.label}</b></button>)}</section>
    <section className="garage-future-controls" aria-label="Controles preparados para próximas versiones"><button type="button" disabled>BEFORE / AFTER · COMING NEXT</button><button type="button" disabled>EXPLODED VIEW · COMING NEXT</button><button type="button" disabled>HIDE / SHOW · COMING NEXT</button></section>

    <section className="garage-update-panel card" aria-live="polite"><div><p className="section-kicker">WHAT CHANGED? · DEMO</p><h2>{selectedUpdate ? selectedUpdate.description : 'Seleccioná una zona con actividad'}</h2><p>{selectedUpdate ? selectedUpdate.analysis : 'Los hotspots con indicador muestran dónde hay una actualización DEMO disponible para el equipo seleccionado.'}</p></div>{selectedUpdate && <><div className="garage-update-facts"><div><span>OBJECTIVE</span><strong>{selectedUpdate.objective}</strong></div><div><span>MAGNITUDE</span><strong>{selectedUpdate.magnitude}</strong></div><div><span>STATUS</span><strong className={`status status--${selectedUpdate.status.toLowerCase().replace('_', '-')}`}>{selectedUpdate.status.replace('_', ' ')}</strong></div><div><span>SOURCE</span><strong>{selectedUpdate.source}</strong></div><div><span>CONFIDENCE</span><strong>{selectedUpdate.confidence}</strong></div></div><div className="garage-score"><span>F1 TECH SCORE</span><strong>{selectedUpdate.score}</strong><em>DEMO</em><dl><div><dt>AERODYNAMICS</dt><dd>{selectedUpdate.componentId === 'cooling' || selectedUpdate.componentId === 'rearSuspension' ? '—' : selectedUpdate.score}</dd></div><div><dt>MAGNITUDE</dt><dd>{selectedUpdate.magnitude}</dd></div><div><dt>CIRCUIT FIT</dt><dd>{selectedUpdate.circuitFit}</dd></div><div><dt>CONFIDENCE</dt><dd>{selectedUpdate.confidence}</dd></div></dl></div></>}</section>
  </section>
}
