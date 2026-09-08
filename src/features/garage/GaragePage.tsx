import { useState } from 'react'
import { activeCarAsset, type CameraPresetId } from '../../three/assets'
import { ModelViewer } from '../../three/ModelViewer'

const cameraPresets: { id: CameraPresetId; label: string }[] = [{ id: 'default', label: 'RESET' }, { id: 'front', label: 'FRONTAL' }, { id: 'rear', label: 'TRASERA' }, { id: 'side', label: 'LATERAL' }, { id: 'top', label: 'SUPERIOR' }]

export function GaragePage() {
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('default')
  return <section className="garage-page dashboard__content" aria-labelledby="garage-title">
    <div className="garage-page__intro"><div><p className="section-kicker">VISUALIZACIÓN TÉCNICA · ENTORNO DEMO</p><h1 id="garage-title">3D Garage<span>.</span></h1><p>Un espacio interactivo para explorar la arquitectura técnica detrás del rendimiento.</p></div><span>ORBIT<br /><i>CONTROLS</i></span></div>
    <p className="demo-notice"><b>MODELO EN PREPARACIÓN</b>El viewer está reservado para un modelo ORIGINAL de F1 TECH. No se cargan ni representan assets de Formula Alpha, VRC, Assetto Corsa u otros terceros.</p>
    <div className="garage-page__layout"><section className="garage-viewer card"><div className="garage-viewer__top"><span>F1 TECH · ORIGINAL ASSET PIPELINE</span><span>{activeCarAsset ? 'MODELO ORIGINAL DISPONIBLE' : 'SIN ASSET REGISTRADO'}</span></div><div className="garage-viewer__canvas">{activeCarAsset ? <ModelViewer asset={activeCarAsset} cameraPreset={cameraPreset} /> : <div className="garage-empty"><span>3D</span><h2>Modelo original en preparación</h2><p>El pipeline está listo para cargar un GLB/GLTF propio desde <code>/public/models</code>, con nodes, hotspots y presets de cámara definidos en el registry.</p><b>NO HAY ASSETS EXTERNOS CARGADOS</b></div>}</div><div className="garage-viewer__legend"><i /> ASSET REGISTRY <span>ESTADO SEGURO</span></div></section>
      <aside className="garage-inspector card"><p className="section-kicker">ARQUITECTURA DEL VIEWER</p><h2>Preparado para inspección técnica</h2><p>Orbit, zoom, vistas, hotspots, selección de componentes, overlays, exploded view, ocultación y comparación Before / After se gobiernan desde el manifest, no desde la geometría.</p><b>F1 TECH ORIGINAL ONLY</b><div className="garage-inspector__readout"><span>MODELO ACTIVO</span><strong>{activeCarAsset?.id ?? 'PENDIENTE DE REGISTRO'}</strong></div></aside></div>
    <section className="garage-controls" aria-label="Vistas de cámara">{cameraPresets.map((preset) => <button disabled={!activeCarAsset} className={preset.id === cameraPreset ? 'garage-controls__item garage-controls__item--active' : 'garage-controls__item'} key={preset.id} onClick={() => setCameraPreset(preset.id)}><span>CAMERA PRESET</span><b>{preset.label}</b></button>)}</section>
  </section>
}
