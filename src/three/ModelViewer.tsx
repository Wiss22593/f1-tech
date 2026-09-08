import { Billboard, Environment, Html, Lightformer, Line, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACESFilmicToneMapping, BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CameraPresetId, CarComponentId, F1TechCarAsset, F1TechHotspot } from './assets'

type ViewerTheme = { primary: string; accent: string; surface: string }
type ViewerProps = { asset?: F1TechCarAsset; cameraPreset: CameraPresetId; theme: ViewerTheme; hotspots: F1TechHotspot[]; activeComponents: readonly CarComponentId[]; selectedComponent?: CarComponentId; onSelectComponent: (componentId: CarComponentId) => void }
type AeroSection = { z: number; width: number; height: number; y: number }

const provisionalCameraPresets: Record<CameraPresetId, [number, number, number]> = {
  default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35],
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
  const radius = rear ? .58 : .51; const width = rear ? .38 : .33; const spokes = rear ? 10 : 9
  return <group position={position} rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[radius, radius * .985, width, 48, 2]} /><meshStandardMaterial color={tyre} roughness={.9} /></mesh>
    <mesh position={[0, width / 2 + .008, 0]}><cylinderGeometry args={[radius * .77, radius * .77, .018, 40]} /><meshStandardMaterial color="#171c25" metalness={.72} roughness={.28} /></mesh>
    <mesh position={[0, -width / 2 - .008, 0]}><cylinderGeometry args={[radius * .77, radius * .77, .018, 40]} /><meshStandardMaterial color="#171c25" metalness={.72} roughness={.28} /></mesh>
    {Array.from({ length: spokes }, (_, index) => <mesh key={index} position={[0, width / 2 + .028, 0]} rotation={[0, 0, index * Math.PI / spokes]}><boxGeometry args={[radius * .08, .028, radius * 1.18]} /><meshStandardMaterial color={rim} metalness={.78} roughness={.22} /></mesh>)}
    <mesh position={[0, width / 2 + .05, 0]}><cylinderGeometry args={[radius * .18, radius * .18, .055, 20]} /><meshStandardMaterial color={carbon} metalness={.68} roughness={.27} /></mesh>
  </group>
}

function ProvisionalCar({ theme, selectedComponent, onSelectComponent }: Pick<ViewerProps, 'theme' | 'selectedComponent' | 'onSelectComponent'>) {
  const body = theme.primary; const carbon = '#171c25'; const black = '#080a0e'; const alloy = '#626b78'; const zone = (id: CarComponentId) => ({ componentId: id, selected: selectedComponent === id, theme, onSelectComponent })
  const nose = [{ z: 2.85, width: .055, height: .045, y: .28 }, { z: 2.38, width: .1, height: .075, y: .3 }, { z: 1.78, width: .16, height: .12, y: .37 }, { z: 1.18, width: .25, height: .18, y: .49 }, { z: .72, width: .3, height: .23, y: .59 }]
  const tub = [{ z: 1.12, width: .27, height: .22, y: .6 }, { z: .62, width: .39, height: .31, y: .7 }, { z: .1, width: .44, height: .35, y: .73 }, { z: -.5, width: .4, height: .35, y: .76 }]
  const engine = [{ z: -.3, width: .34, height: .31, y: .84 }, { z: -.82, width: .42, height: .47, y: .92 }, { z: -1.35, width: .32, height: .39, y: .87 }, { z: -1.88, width: .16, height: .2, y: .69 }]
  const pod = [{ z: .72, width: .14, height: .09, y: .48 }, { z: .3, width: .35, height: .22, y: .51 }, { z: -.25, width: .5, height: .29, y: .53 }, { z: -.88, width: .43, height: .24, y: .48 }, { z: -1.42, width: .19, height: .13, y: .43 }]
  const floor = [{ z: 2.15, width: .43, height: .035, y: .16 }, { z: 1.15, width: .73, height: .05, y: .14 }, { z: .2, width: 1.0, height: .07, y: .14 }, { z: -.85, width: 1.05, height: .09, y: .16 }, { z: -2.12, width: .72, height: .12, y: .25 }]
  return <group>
    <Zone {...zone('floor')}><Loft sections={floor} color={carbon} metalness={.55} roughness={.27} /><Wing position={[0, .15, -.45]} span={2.12} chord={3.18} thickness={.04} camber={.02} color={black} />{[-.8, -.42, 0, .42, .8].map((x) => <Wing key={x} position={[x, .2, -1.55]} span={.09} chord={1.1} thickness={.035} camber={.07} color="#11161e" rotation={[.28, 0, 0]} />)}</Zone>
    <Zone {...zone('nose')}><Loft sections={nose} color={body} metalness={.58} roughness={.25} /><Loft sections={[{ z: 1.6, width: .1, height: .07, y: .35 }, { z: .86, width: .16, height: .12, y: .46 }]} color={carbon} /></Zone><Zone {...zone('chassis')}><Loft sections={tub} color={body} metalness={.56} roughness={.25} /></Zone>
    <Zone {...zone('frontWing')}><Wing position={[0, .19, 2.98]} span={3.18} chord={.78} thickness={.055} camber={.1} color={carbon} /><Wing position={[0, .3, 2.75]} span={2.86} chord={.58} thickness={.042} camber={.085} color={body} /><Wing position={[0, .41, 2.57]} span={2.42} chord={.42} thickness={.032} camber={.065} color={carbon} />{[-1, 1].map((side) => <group key={side}><Loft position={[side * 1.46, 0, 2.78]} sections={[{ z: -.34, width: .045, height: .31, y: .28 }, { z: .32, width: .045, height: .46, y: .33 }]} color={black} /><Wing position={[side * 1.2, .48, 2.48]} span={.46} chord={.34} thickness={.022} camber={.05} color={body} rotation={[0, side * .18, side * .08]} /></group>)}<Rod from={[0, .31, 2.22]} to={[-.28, .25, 2.69]} color={carbon} /><Rod from={[0, .31, 2.22]} to={[.28, .25, 2.69]} color={carbon} /></Zone>
    <Zone {...zone('sidepods')}>{[-1, 1].map((side) => <group key={side}><Loft position={[side * .66, 0, 0]} sections={pod} color={body} metalness={.56} roughness={.25} /><Loft position={[side * 1.02, 0, .22]} sections={[{ z: .25, width: .13, height: .15, y: .58 }, { z: -.18, width: .2, height: .18, y: .57 }]} color={black} metalness={.15} roughness={.62} /><Loft position={[side * 1.08, 0, -.18]} sections={[{ z: .16, width: .07, height: .07, y: .73 }, { z: -.5, width: .12, height: .09, y: .69 }, { z: -.93, width: .06, height: .05, y: .58 }]} color={carbon} /></group>)}</Zone>
    <Zone {...zone('cooling')}>{[-1, 1].map((side) => <Loft key={side} position={[side * 1.13, 0, 0]} sections={[{ z: .29, width: .055, height: .1, y: .6 }, { z: -.32, width: .09, height: .14, y: .58 }, { z: -.74, width: .05, height: .07, y: .57 }]} color={theme.surface} metalness={.2} roughness={.62} />)}</Zone>
    <Zone {...zone('engineCover')}><Loft sections={engine} color={body} metalness={.56} roughness={.24} /><Loft position={[0, 0, -.91]} sections={[{ z: .32, width: .12, height: .15, y: 1.38 }, { z: -.12, width: .22, height: .25, y: 1.3 }, { z: -.46, width: .13, height: .16, y: 1.13 }]} color={carbon} /><Loft position={[0, 0, -.95]} sections={[{ z: .16, width: .065, height: .07, y: 1.41 }, { z: -.1, width: .1, height: .09, y: 1.37 }]} color={black} metalness={.12} roughness={.75} /></Zone>
    <mesh position={[0, .86, .2]} scale={[.35, .075, .48]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color={black} roughness={.7} /></mesh>
    <Zone {...zone('halo')}><mesh position={[0, 1.04, .19]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]}><torusGeometry args={[.43, .034, 8, 30, Math.PI]} /><meshStandardMaterial color={black} metalness={.7} roughness={.25} /></mesh><Rod from={[0, .84, .52]} to={[0, 1.22, .22]} color={black} radius={.032} /><Rod from={[-.36, .78, .05]} to={[-.36, 1.02, .24]} color={black} radius={.028} /><Rod from={[.36, .78, .05]} to={[.36, 1.02, .24]} color={black} radius={.028} /></Zone>
    <Zone {...zone('frontSuspension')}>{[-1, 1].map((side) => <group key={side}><Rod from={[side * .28, .66, .72]} to={[side * 1.18, .35, 1.3]} color={carbon} radius={.023} /><Rod from={[side * .34, .44, .58]} to={[side * 1.18, .22, 1.3]} color={carbon} radius={.023} /><Rod from={[side * .3, .58, .36]} to={[side * 1.18, .33, 1.3]} color={alloy} radius={.017} /></group>)}</Zone>
    <Zone {...zone('rearSuspension')}>{[-1, 1].map((side) => <group key={side}><Rod from={[side * .43, .67, -1.13]} to={[side * 1.25, .38, -1.43]} color={carbon} radius={.024} /><Rod from={[side * .42, .41, -1.27]} to={[side * 1.25, .22, -1.43]} color={carbon} radius={.023} /><Rod from={[side * .3, .82, -1.23]} to={[side * 1.25, .34, -1.43]} color={alloy} radius={.018} /></group>)}</Zone>
    <Zone {...zone('frontBrake')}>{[-1, 1].map((side) => <group key={side}><mesh position={[side * 1.18, .29, 1.3]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.24, .24, .14, 24]} /><meshStandardMaterial color={alloy} metalness={.85} roughness={.2} /></mesh><mesh position={[side * 1.18, .38, 1.3]} scale={[.15, .12, .1]}><boxGeometry /><meshStandardMaterial color={theme.accent} metalness={.55} roughness={.3} /></mesh></group>)}</Zone>
    <Zone {...zone('wheels')}><Wheel position={[-1.23, .28, 1.28]} tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[1.23, .28, 1.28]} tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[-1.26, .31, -1.42]} rear tyre={black} rim={carbon} carbon={theme.accent} /><Wheel position={[1.26, .31, -1.42]} rear tyre={black} rim={carbon} carbon={theme.accent} /></Zone>
    <Zone {...zone('rearBrake')}>{[-1, 1].map((side) => <mesh key={side} position={[side * 1.25, .32, -1.43]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.27, .27, .15, 24]} /><meshStandardMaterial color={alloy} metalness={.84} roughness={.2} /></mesh>)}</Zone>
    <Zone {...zone('diffuser')}>{[-.72, -.43, -.14, .14, .43, .72].map((x) => <Wing key={x} position={[x, .25, -2.3]} span={.065} chord={.7} thickness={.042} camber={.1} color={black} rotation={[.3, 0, 0]} />)}</Zone>
    <Zone {...zone('rearWing')}><Wing position={[0, 1.55, -2.23]} span={2.45} chord={.58} thickness={.07} camber={.1} color={carbon} rotation={[.06, 0, 0]} /><Wing position={[0, 1.36, -2.08]} span={2.15} chord={.42} thickness={.045} camber={.07} color={body} rotation={[.08, 0, 0]} /><Loft position={[-1.1, 0, -2.18]} sections={[{ z: -.25, width: .05, height: .42, y: 1.25 }, { z: .25, width: .05, height: .52, y: 1.35 }]} color={black} /><Loft position={[1.1, 0, -2.18]} sections={[{ z: -.25, width: .05, height: .42, y: 1.25 }, { z: .25, width: .05, height: .52, y: 1.35 }]} color={black} /><Rod from={[-.42, .8, -1.6]} to={[-.42, 1.34, -2.16]} color={carbon} /><Rod from={[.42, .8, -1.6]} to={[.42, 1.34, -2.16]} color={carbon} /></Zone>
  </group>
}

function CameraFocus({ hotspot, controlsRef }: { hotspot?: F1TechHotspot; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  useEffect(() => {
    const controls = controlsRef.current
    if (!hotspot || !controls) return
    const startPosition = camera.position.clone(); const startTarget = controls.target.clone(); const target = new Vector3(...hotspot.inspectionView.target)
    const destination = new Vector3(...hotspot.inspectionView.position); const startedAt = performance.now(); const duration = hotspot.inspectionView.duration ?? 760
    controls.maxPolarAngle = hotspot.id === 'floor' ? Math.PI - .08 : Math.PI / 2.08
    let frame = 0; controls.enabled = false
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1); const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
      camera.position.lerpVectors(startPosition, destination, eased); controls.target.lerpVectors(startTarget, target, eased); controls.update()
      if (progress < 1) frame = requestAnimationFrame(animate); else controls.enabled = true
    }
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); controls.enabled = true }
  }, [camera, controlsRef, hotspot])
  return null
}

function TechnicalCallouts({ hotspots, activeComponents, selectedComponent, onFocus }: Pick<ViewerProps, 'hotspots' | 'activeComponents' | 'selectedComponent'> & { onFocus: (hotspot: F1TechHotspot) => void }) {
  const [hoveredId, setHoveredId] = useState<string>()
  return <>{hotspots.map((hotspot) => {
    const active = activeComponents.includes(hotspot.componentId); const selected = selectedComponent === hotspot.componentId; const hovered = hoveredId === hotspot.id
    const color = selected ? '#ffffff' : active || hovered ? '#9de6dc' : '#5f6674'; const labelClass = `garage-callout-label ${selected ? 'garage-callout-label--selected' : active ? 'garage-callout-label--active' : 'garage-callout-label--normal'}${hovered ? ' garage-callout-label--hovered' : ''}`
    return <group key={hotspot.id} position={hotspot.position}>
      <Line points={[[0, 0, 0], hotspot.calloutOffset]} color={color} lineWidth={1} transparent opacity={selected ? .92 : hovered ? .76 : active ? .48 : .22} />
      <Billboard><group onPointerOver={(event) => { event.stopPropagation(); setHoveredId(hotspot.id) }} onPointerOut={() => setHoveredId(undefined)} onClick={(event) => { event.stopPropagation(); onFocus(hotspot) }}><mesh><sphereGeometry args={[selected ? .075 : hovered || active ? .052 : .034, 16, 16]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>{selected && <mesh><ringGeometry args={[.11, .125, 24]} /><meshBasicMaterial color={color} transparent opacity={.7} side={2} toneMapped={false} /></mesh>}</group></Billboard>
      <Html position={hotspot.calloutOffset} center distanceFactor={9} zIndexRange={[10, 0]}><button type="button" className={labelClass} onMouseEnter={() => setHoveredId(hotspot.id)} onMouseLeave={() => setHoveredId(undefined)} onClick={(event) => { event.stopPropagation(); onFocus(hotspot) }}><i />{hotspot.label}</button></Html>
    </group>
  })}</>
}

export function ModelViewer({ asset, cameraPreset, theme, hotspots, activeComponents, selectedComponent, onSelectComponent }: ViewerProps) {
  const cameraPosition = asset?.cameraPresets[cameraPreset] ?? provisionalCameraPresets[cameraPreset]
  const controlsRef = useRef<OrbitControlsImpl>(null); const [focusedHotspot, setFocusedHotspot] = useState<F1TechHotspot>()
  function focusHotspot(hotspot: F1TechHotspot) { onSelectComponent(hotspot.componentId); setFocusedHotspot(hotspot) }
  return <Canvas shadows gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.6 }} camera={{ position: cameraPosition, fov: 40 }} dpr={[1, 1.5]}><color attach="background" args={['#0b0c11']} /><ambientLight intensity={1.25} /><hemisphereLight args={['#e5efff', '#1a1f2a', 2.35]} /><directionalLight castShadow position={[5.5, 7.5, 6]} intensity={8} color="#ffffff" shadow-mapSize={[2048, 2048]} shadow-radius={4} shadow-bias={-.0001} /><directionalLight position={[-6, 4, 4.5]} intensity={4.8} color="#c9e1ff" /><directionalLight position={[1.5, 5.5, -6.5]} intensity={5.2} color="#dceaff" /><directionalLight position={[-2.5, 7, -.5]} intensity={3.4} color="#ffffff" /><pointLight position={[0, 2.8, 4.5]} intensity={3.2} distance={11} color="#ffffff" /><Environment resolution={256}><Lightformer form="rect" intensity={8} color="#ffffff" position={[0, 6, 5]} scale={[10, 5, 1]} /><Lightformer form="rect" intensity={5} color="#b9d8ff" position={[-6, 2, 2]} scale={[5, 3, 1]} /><Lightformer form="rect" intensity={4} color="#dce9ff" position={[3, 4, -6]} scale={[6, 3, 1]} /></Environment><CameraPreset position={cameraPosition} /><ViewerErrorBoundary fallback={<Html center><span className="viewer-fallback">No se pudo cargar el modelo original.</span></Html>}><Suspense fallback={<Html center><span className="viewer-fallback">Cargando modelo original…</span></Html>}>{asset ? <OriginalModel asset={asset} /> : <ProvisionalCar theme={theme} selectedComponent={selectedComponent} onSelectComponent={onSelectComponent} />}</Suspense></ViewerErrorBoundary><TechnicalCallouts hotspots={hotspots} activeComponents={activeComponents} selectedComponent={selectedComponent} onFocus={focusHotspot} /><CameraFocus hotspot={focusedHotspot} controlsRef={controlsRef} /><OrbitControls ref={controlsRef} enablePan={false} enableDamping dampingFactor={.08} rotateSpeed={.45} minDistance={3} maxDistance={15} minPolarAngle={.08} maxPolarAngle={Math.PI / 2.08} target={[0, .55, 0]} /></Canvas>
}
