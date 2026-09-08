import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from 'three'
import type { CameraPresetId, CarComponentId, F1TechCarAsset, F1TechHotspot } from './assets'

type ViewerTheme = { primary: string; accent: string; surface: string }
type ViewerProps = { asset?: F1TechCarAsset; cameraPreset: CameraPresetId; theme: ViewerTheme; hotspots: F1TechHotspot[]; activeComponents: readonly CarComponentId[]; selectedComponent?: CarComponentId; onSelectComponent: (componentId: CarComponentId) => void }
type AeroSection = { z: number; width: number; height: number; y: number }

const provisionalCameraPresets: Record<CameraPresetId, [number, number, number]> = {
  default: [6.5, 3.8, 7.5], front: [0, 2.1, 8.6], rear: [0, 2.4, -8.6], side: [8.5, 2.8, 0], top: [0, 9, .5],
}

function createLoftGeometry(sections: AeroSection[]) {
  const vertices: number[] = []; const indices: number[] = []; const ringSize = 8
  sections.forEach(({ z, width, height, y }) => {
    [[0, height], [width * .72, height * .72], [width, 0], [width * .74, -height * .68], [0, -height], [-width * .74, -height * .68], [-width, 0], [-width * .72, height * .72]].forEach(([x, offsetY]) => vertices.push(x, y + offsetY, z))
  })
  for (let section = 0; section < sections.length - 1; section += 1) for (let point = 0; point < ringSize; point += 1) {
    const next = (point + 1) % ringSize; const current = section * ringSize + point; const following = (section + 1) * ringSize + point
    indices.push(current, following, section * ringSize + next, section * ringSize + next, following, (section + 1) * ringSize + next)
  }
  const start = vertices.length / 3; vertices.push(0, sections[0].y, sections[0].z)
  const end = vertices.length / 3; const final = sections[sections.length - 1]; vertices.push(0, final.y, final.z)
  for (let point = 0; point < ringSize; point += 1) { const next = (point + 1) % ringSize; indices.push(start, next, point, end, (sections.length - 1) * ringSize + point, (sections.length - 1) * ringSize + next) }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function createWingGeometry(span: number, chord: number, thickness: number, camber: number) {
  const vertices: number[] = []; const indices: number[] = []; const xs = [-span / 2, -span * .22, span * .22, span / 2]; const zs = [chord / 2, chord * .1, -chord * .34, -chord / 2]
  for (const yOffset of [thickness / 2, -thickness / 2]) for (const x of xs) for (const z of zs) vertices.push(x, yOffset + camber * (1 - (z / (chord / 2)) ** 2) * (1 - Math.abs(x) / span), z)
  const row = zs.length; const layer = xs.length * row
  for (let layerIndex = 0; layerIndex < 2; layerIndex += 1) for (let x = 0; x < xs.length - 1; x += 1) for (let z = 0; z < zs.length - 1; z += 1) {
    const a = layerIndex * layer + x * row + z; const b = a + row; const c = b + 1; const d = a + 1
    indices.push(layerIndex ? a : a, layerIndex ? d : b, layerIndex ? b : d, layerIndex ? b : a, layerIndex ? c : d, layerIndex ? c : b)
  }
  for (let x = 0; x < xs.length - 1; x += 1) for (const z of [0, zs.length - 1]) { const a = x * row + z; const b = (x + 1) * row + z; indices.push(a, b, layer + a, b, layer + b, layer + a) }
  for (let z = 0; z < zs.length - 1; z += 1) for (const x of [0, xs.length - 1]) { const a = x * row + z; const b = a + 1; indices.push(a, layer + a, b, b, layer + a, layer + b) }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function Loft({ sections, position = [0, 0, 0], color, metalness = .45, roughness = .34 }: { sections: AeroSection[]; position?: [number, number, number]; color: string; metalness?: number; roughness?: number }) {
  const geometry = useMemo(() => createLoftGeometry(sections), [sections])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position}><meshStandardMaterial color={color} metalness={metalness} roughness={roughness} /></mesh>
}

function Wing({ position, span, chord, thickness, camber, color, rotation = [0, 0, 0] }: { position: [number, number, number]; span: number; chord: number; thickness: number; camber: number; color: string; rotation?: [number, number, number] }) {
  const geometry = useMemo(() => createWingGeometry(span, chord, thickness, camber), [span, chord, thickness, camber])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position} rotation={rotation}><meshStandardMaterial color={color} metalness={.48} roughness={.36} /></mesh>
}

function Rod({ from, to, color, radius = .027 }: { from: [number, number, number]; to: [number, number, number]; color: string; radius?: number }) {
  const { midpoint, length, quaternion } = useMemo(() => { const start = new Vector3(...from); const end = new Vector3(...to); const direction = end.clone().sub(start); return { midpoint: start.clone().add(end).multiplyScalar(.5), length: direction.length(), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()) } }, [from, to])
  return <mesh position={midpoint} quaternion={quaternion}><cylinderGeometry args={[radius, radius, length, 10]} /><meshStandardMaterial color={color} metalness={.65} roughness={.3} /></mesh>
}

class ViewerErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* El estado visual evita fallar toda la aplicación. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function CameraPreset({ position }: { position: [number, number, number] }) {
  const { camera } = useThree()
  useEffect(() => { camera.position.set(...position); camera.lookAt(0, .55, 0) }, [camera, position])
  return null
}

function OriginalModel({ asset }: { asset: F1TechCarAsset }) { const { scene } = useGLTF(asset.path); return <primitive object={scene} scale={asset.scale} rotation={asset.rotation} /> }

function Zone({ componentId, selected, theme, onSelectComponent, children }: { componentId: CarComponentId; selected: boolean; theme: ViewerTheme; onSelectComponent: (id: CarComponentId) => void; children: ReactNode }) {
  return <group onClick={(event) => { event.stopPropagation(); onSelectComponent(componentId) }}>{children}{selected && <pointLight color={theme.accent} intensity={4} distance={3} />}</group>
}

function Wheel({ position, rear, tyre, rim, carbon }: { position: [number, number, number]; rear?: boolean; tyre: string; rim: string; carbon: string }) {
  const radius = rear ? .57 : .49; const width = rear ? .36 : .31
  return <group position={position} rotation={[0, 0, Math.PI / 2]}><mesh><cylinderGeometry args={[radius, radius, width, 32]} /><meshStandardMaterial color={tyre} roughness={.84} /></mesh><mesh position={[0, width / 2 + .006, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius * .86, .025, 8, 28]} /><meshStandardMaterial color="#303641" roughness={.72} /></mesh><mesh position={[0, -width / 2 - .006, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius * .86, .025, 8, 28]} /><meshStandardMaterial color="#303641" roughness={.72} /></mesh><mesh position={[0, width / 2 + .012, 0]}><cylinderGeometry args={[radius * .48, radius * .48, .025, 24]} /><meshStandardMaterial color={rim} metalness={.72} roughness={.25} /></mesh><mesh position={[0, width / 2 + .035, 0]}><cylinderGeometry args={[radius * .17, radius * .17, .04, 16]} /><meshStandardMaterial color={carbon} metalness={.7} roughness={.28} /></mesh></group>
}

function ProvisionalCar({ theme, selectedComponent, onSelectComponent }: Pick<ViewerProps, 'theme' | 'selectedComponent' | 'onSelectComponent'>) {
  const body = theme.primary; const carbon = '#202630'; const black = '#0a0c11'; const zone = (id: CarComponentId) => ({ componentId: id, selected: selectedComponent === id, theme, onSelectComponent })
  const nose = [{ z: 2.78, width: .07, height: .06, y: .31 }, { z: 2.25, width: .13, height: .1, y: .34 }, { z: 1.55, width: .2, height: .15, y: .42 }, { z: .7, width: .31, height: .24, y: .54 }]
  const chassis = [{ z: 1.05, width: .27, height: .24, y: .57 }, { z: .42, width: .4, height: .33, y: .66 }, { z: -.35, width: .48, height: .4, y: .69 }, { z: -1.2, width: .36, height: .35, y: .76 }]
  const pod = [{ z: .68, width: .23, height: .14, y: .47 }, { z: .12, width: .43, height: .28, y: .5 }, { z: -.75, width: .46, height: .31, y: .52 }, { z: -1.42, width: .26, height: .24, y: .58 }]
  const engine = [{ z: -.25, width: .33, height: .33, y: .83 }, { z: -.95, width: .39, height: .43, y: .88 }, { z: -1.7, width: .2, height: .27, y: .76 }]
  return <group>
    <Zone {...zone('floor')}><Loft sections={[{ z: 2.05, width: .55, height: .05, y: .18 }, { z: .65, width: .92, height: .07, y: .17 }, { z: -.8, width: 1.04, height: .08, y: .18 }, { z: -2.15, width: .74, height: .12, y: .22 }]} color={carbon} /><Wing position={[0, .16, -.4]} span={2.15} chord={3.25} thickness={.045} camber={.025} color="#151a22" /><Loft position={[-.58, 0, 0]} sections={[{ z: .6, width: .13, height: .045, y: .1 }, { z: -.55, width: .2, height: .075, y: .12 }, { z: -1.75, width: .12, height: .09, y: .2 }]} color={black} /><Loft position={[.58, 0, 0]} sections={[{ z: .6, width: .13, height: .045, y: .1 }, { z: -.55, width: .2, height: .075, y: .12 }, { z: -1.75, width: .12, height: .09, y: .2 }]} color={black} /></Zone>
    <Zone {...zone('nose')}><Loft sections={nose} color={body} /></Zone><Zone {...zone('chassis')}><Loft sections={chassis} color={body} /></Zone>
    <Zone {...zone('frontWing')}><Wing position={[0, .2, 2.88]} span={3.15} chord={.72} thickness={.06} camber={.1} color={carbon} /><Wing position={[0, .32, 2.69]} span={2.72} chord={.54} thickness={.045} camber={.08} color={body} /><Wing position={[0, .43, 2.54]} span={2.3} chord={.38} thickness={.035} camber={.06} color={carbon} /><Wing position={[-1.15, .5, 2.48]} span={.42} chord={.34} thickness={.025} camber={.05} color={body} rotation={[0, .18, .08]} /><Wing position={[1.15, .5, 2.48]} span={.42} chord={.34} thickness={.025} camber={.05} color={body} rotation={[0, -.18, -.08]} /><Loft position={[-1.48, 0, 2.76]} sections={[{ z: -.32, width: .05, height: .33, y: .26 }, { z: .32, width: .05, height: .43, y: .31 }]} color={black} /><Loft position={[1.48, 0, 2.76]} sections={[{ z: -.32, width: .05, height: .33, y: .26 }, { z: .32, width: .05, height: .43, y: .31 }]} color={black} /><Rod from={[0, .33, 2.25]} to={[-.26, .27, 2.65]} color={carbon} /><Rod from={[0, .33, 2.25]} to={[.26, .27, 2.65]} color={carbon} /></Zone>
    <Zone {...zone('sidepods')}><Loft position={[-.62, 0, 0]} sections={pod} color={body} /><Loft position={[.62, 0, 0]} sections={pod} color={body} /><Loft position={[-.73, 0, .43]} sections={[{ z: .18, width: .13, height: .09, y: .54 }, { z: -.18, width: .2, height: .14, y: .57 }]} color={carbon} /><Loft position={[.73, 0, .43]} sections={[{ z: .18, width: .13, height: .09, y: .54 }, { z: -.18, width: .2, height: .14, y: .57 }]} color={carbon} /></Zone>
    <Zone {...zone('cooling')}><Loft position={[-1.02, 0, 0]} sections={[{ z: .42, width: .09, height: .1, y: .57 }, { z: -.35, width: .12, height: .13, y: .58 }, { z: -.78, width: .08, height: .08, y: .6 }]} color={theme.surface} metalness={.2} roughness={.6} /><Loft position={[1.02, 0, 0]} sections={[{ z: .42, width: .09, height: .1, y: .57 }, { z: -.35, width: .12, height: .13, y: .58 }, { z: -.78, width: .08, height: .08, y: .6 }]} color={theme.surface} metalness={.2} roughness={.6} /></Zone>
    <Zone {...zone('engineCover')}><Loft sections={engine} color={body} /><Loft position={[0, 0, -1.02]} sections={[{ z: .24, width: .13, height: .16, y: 1.32 }, { z: -.2, width: .22, height: .25, y: 1.24 }, { z: -.48, width: .15, height: .16, y: 1.12 }]} color={carbon} /><Loft position={[0, 0, -1.04]} sections={[{ z: .16, width: .07, height: .08, y: 1.35 }, { z: -.08, width: .1, height: .1, y: 1.31 }]} color={black} metalness={.15} roughness={.7} /></Zone>
    <mesh position={[0, .86, .2]} scale={[.35, .075, .48]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color={black} roughness={.7} /></mesh>
    <Zone {...zone('halo')}><mesh position={[0, 1.04, .19]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]}><torusGeometry args={[.43, .034, 8, 30, Math.PI]} /><meshStandardMaterial color={black} metalness={.7} roughness={.25} /></mesh><Rod from={[0, .84, .52]} to={[0, 1.22, .22]} color={black} radius={.032} /><Rod from={[-.36, .78, .05]} to={[-.36, 1.02, .24]} color={black} radius={.028} /><Rod from={[.36, .78, .05]} to={[.36, 1.02, .24]} color={black} radius={.028} /></Zone>
    <Zone {...zone('frontSuspension')}>{[-1, 1].map((side) => <group key={side}><Rod from={[side * .27, .64, .72]} to={[side * 1.16, .35, 1.28]} color={carbon} /><Rod from={[side * .32, .44, .62]} to={[side * 1.16, .23, 1.28]} color={carbon} /><Rod from={[side * .32, .52, .4]} to={[side * 1.16, .32, 1.28]} color={carbon} radius={.02} /></group>)}</Zone>
    <Zone {...zone('rearSuspension')}>{[-1, 1].map((side) => <group key={side}><Rod from={[side * .45, .66, -1.1]} to={[side * 1.2, .38, -1.4]} color={carbon} /><Rod from={[side * .4, .42, -1.25]} to={[side * 1.2, .22, -1.4]} color={carbon} /><Rod from={[side * .32, .8, -1.25]} to={[side * 1.2, .34, -1.4]} color={carbon} radius={.02} /></group>)}</Zone>
    <Zone {...zone('frontBrake')}><mesh position={[-1.18, .27, 1.28]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.23, .23, .13, 20]} /><meshStandardMaterial color={theme.accent} metalness={.7} roughness={.25} /></mesh><mesh position={[1.18, .27, 1.28]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.23, .23, .13, 20]} /><meshStandardMaterial color={theme.accent} metalness={.7} roughness={.25} /></mesh></Zone>
    <Zone {...zone('wheels')}><Wheel position={[-1.23, .28, 1.28]} tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[1.23, .28, 1.28]} tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[-1.26, .31, -1.42]} rear tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[1.26, .31, -1.42]} rear tyre={black} rim={carbon} carbon={theme.accent} /></Zone>
    <Zone {...zone('diffuser')}>{[-.62, -.31, 0, .31, .62].map((x) => <Wing key={x} position={[x, .26, -2.28]} span={.07} chord={.58} thickness={.05} camber={.08} color={black} rotation={[.24, 0, 0]} />)}</Zone>
    <Zone {...zone('rearWing')}><Wing position={[0, 1.55, -2.23]} span={2.45} chord={.58} thickness={.07} camber={.1} color={carbon} rotation={[.06, 0, 0]} /><Wing position={[0, 1.36, -2.08]} span={2.15} chord={.42} thickness={.045} camber={.07} color={body} rotation={[.08, 0, 0]} /><Loft position={[-1.1, 0, -2.18]} sections={[{ z: -.25, width: .05, height: .42, y: 1.25 }, { z: .25, width: .05, height: .52, y: 1.35 }]} color={black} /><Loft position={[1.1, 0, -2.18]} sections={[{ z: -.25, width: .05, height: .42, y: 1.25 }, { z: .25, width: .05, height: .52, y: 1.35 }]} color={black} /><Rod from={[-.42, .8, -1.6]} to={[-.42, 1.34, -2.16]} color={carbon} /><Rod from={[.42, .8, -1.6]} to={[.42, 1.34, -2.16]} color={carbon} /></Zone>
  </group>
}

function Hotspots({ hotspots, activeComponents, selectedComponent, onSelectComponent }: Pick<ViewerProps, 'hotspots' | 'activeComponents' | 'selectedComponent' | 'onSelectComponent'>) {
  return <>{hotspots.map((hotspot) => { const active = activeComponents.includes(hotspot.componentId); const selected = selectedComponent === hotspot.componentId
    return <Html key={hotspot.id} position={hotspot.position} center distanceFactor={8} zIndexRange={[10, 0]}><button type="button" className={selected ? 'garage-hotspot garage-hotspot--selected' : active ? 'garage-hotspot garage-hotspot--active' : 'garage-hotspot'} onClick={() => onSelectComponent(hotspot.componentId)} aria-label={`Seleccionar ${hotspot.label}`}><i />{selected && <span>{hotspot.label}</span>}</button></Html>
  })}</>
}

export function ModelViewer({ asset, cameraPreset, theme, hotspots, activeComponents, selectedComponent, onSelectComponent }: ViewerProps) {
  const cameraPosition = asset?.cameraPresets[cameraPreset] ?? provisionalCameraPresets[cameraPreset]
  return <Canvas camera={{ position: cameraPosition, fov: 42 }} dpr={[1, 1.5]}><color attach="background" args={['#0b0c11']} /><ambientLight intensity={.85} /><directionalLight position={[5, 8, 4]} intensity={2.5} /><directionalLight position={[-4, 2, -3]} intensity={1.2} color={theme.primary} /><CameraPreset position={cameraPosition} /><ViewerErrorBoundary fallback={<Html center><span className="viewer-fallback">No se pudo cargar el modelo original.</span></Html>}><Suspense fallback={<Html center><span className="viewer-fallback">Cargando modelo original…</span></Html>}>{asset ? <OriginalModel asset={asset} /> : <ProvisionalCar theme={theme} selectedComponent={selectedComponent} onSelectComponent={onSelectComponent} />}</Suspense></ViewerErrorBoundary><Hotspots hotspots={hotspots} activeComponents={activeComponents} selectedComponent={selectedComponent} onSelectComponent={onSelectComponent} /><OrbitControls enablePan={false} minDistance={3} maxDistance={15} target={[0, .55, 0]} /></Canvas>
}
