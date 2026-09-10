import { Billboard, Environment, Html, Lightformer, Line, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACESFilmicToneMapping, Color, Mesh, Vector3, type WebGLProgramParametersWithUniforms } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CameraPresetId, CarComponentId, F1TechCarAsset, F1TechHotspot } from './assets'
import { garageText, type Locale } from '../i18n'

type ViewerTheme = { primary: string; secondary: string; bodyBase: string; bodySecondary: string; accent: string; highlight: string; carbon: string; metallic: string; glass: string; wheel: string; brake: string; neutral: string; surface: string; materialMetalness: number; materialRoughness: number; materialEmissiveIntensity: number }
type ViewerProps = { asset: F1TechCarAsset; locale: Locale; cameraPreset: CameraPresetId; theme: ViewerTheme; hotspots: F1TechHotspot[]; activeComponents: readonly CarComponentId[]; selectedComponent?: CarComponentId; selectedHotspot?: F1TechHotspot; focusRequestId?: number; showCallouts?: boolean; onSelectComponent: (componentId: CarComponentId) => void }
const mobileCameraScale = 1.42

function useMobileViewer() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
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

function OriginalModel({ asset, theme }: { asset: F1TechCarAsset; theme: ViewerTheme }) {
  const { scene } = useGLTF(asset.path)
  const model = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return
      node.castShadow = true; node.receiveShadow = true
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      const themedMaterials = materials.map((material) => {
        const themed = material.clone() as typeof material & { color?: { set: (value: string) => void }; emissive?: { set: (value: string) => void }; map?: unknown; roughness?: number; metalness?: number; envMapIntensity?: number; emissiveIntensity?: number; needsUpdate?: boolean }
        // Inspected GLB materials: carbon_mat, cockpit_mat, livery and Wheels. Only
        // `livery` is the painted body; clearing its baked texture on the cloned
        // material gives every team a reliably visible identity without blackening
        // carbon, glass/cockpit or wheel surfaces.
        if (themed.name === 'livery' && themed.color) {
          // Source hue is removed, while the original metallic/roughness map is
          // retained. The body reads as a PBR surface; carbon, cockpit and wheels
          // are untouched because their materials are not themed.
          themed.map = null; themed.color.set(theme.bodyBase); themed.roughness = theme.materialRoughness; themed.metalness = theme.materialMetalness; themed.envMapIntensity = .62
          themed.emissive?.set(theme.accent); themed.emissiveIntensity = theme.materialEmissiveIntensity; themed.needsUpdate = true
          // A single, scoped shader pass gives the shared BGRT body its own
          // F1 TECH language: a secondary plane and a narrow accent ribbon.
          // `onBeforeCompile` always receives a fresh source, so these markers
          // cannot accumulate across team switches.
          themed.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
            shader.uniforms.f1TechBodySecondary = { value: new Color(theme.bodySecondary) }
            shader.uniforms.f1TechAccent = { value: new Color(theme.accent) }
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', '#include <common>\nvarying vec3 vF1TechLiveryPosition;')
              .replace('#include <begin_vertex>', '#include <begin_vertex>\nvF1TechLiveryPosition = transformed;')
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', '#include <common>\nuniform vec3 f1TechBodySecondary;\nuniform vec3 f1TechAccent;\nvarying vec3 vF1TechLiveryPosition;')
              .replace('#include <color_fragment>', `#include <color_fragment>
float f1TechSweep = sin(vF1TechLiveryPosition.z * 4.6 + vF1TechLiveryPosition.x * 2.1);
float f1TechSecondaryMask = smoothstep(0.46, 0.86, f1TechSweep) * 0.38;
float f1TechAccentMask = smoothstep(0.88, 0.97, f1TechSweep) * 0.72;
diffuseColor.rgb = mix(diffuseColor.rgb, f1TechBodySecondary, f1TechSecondaryMask);
diffuseColor.rgb = mix(diffuseColor.rgb, f1TechAccent, f1TechAccentMask);`)
          }
          themed.customProgramCacheKey = () => `f1-tech-livery-${theme.bodyBase}-${theme.bodySecondary}-${theme.accent}`
        }
        return themed
      })
      node.material = Array.isArray(node.material) ? themedMaterials : themedMaterials[0]
    })
  }, [model, theme])
  return <primitive object={model} scale={asset.scale} rotation={asset.rotation} />
}

function CameraFocus({ hotspot, controlsRef, requestId, defaultPosition, positionScale = 1 }: { hotspot?: F1TechHotspot; controlsRef: React.RefObject<OrbitControlsImpl | null>; requestId?: number; defaultPosition: [number, number, number]; positionScale?: number }) {
  const { camera } = useThree()
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const startPosition = camera.position.clone(); const startTarget = controls.target.clone(); const target = hotspot ? new Vector3(...hotspot.inspectionView.target) : new Vector3(0, .55, 0)
    const destination = hotspot ? new Vector3(...hotspot.inspectionView.position) : new Vector3(...defaultPosition)
    if (hotspot && positionScale !== 1) destination.sub(target).multiplyScalar(positionScale).add(target)
    const startedAt = performance.now(); const duration = hotspot?.inspectionView.duration ?? 620
    controls.maxPolarAngle = hotspot?.id === 'floor' ? Math.PI - .08 : Math.PI / 2.08
    let frame = 0; controls.enabled = false
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1); const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
      camera.position.lerpVectors(startPosition, destination, eased); controls.target.lerpVectors(startTarget, target, eased); controls.update()
      if (progress < 1) frame = requestAnimationFrame(animate); else controls.enabled = true
    }
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); controls.enabled = true }
  }, [camera, controlsRef, defaultPosition, hotspot, positionScale, requestId])
  return null
}

function InspectionHighlight({ hotspot, color }: { hotspot?: F1TechHotspot; color: string }) {
  if (!hotspot) return null
  return <pointLight position={hotspot.position} color={color} intensity={1.25} distance={2.1} decay={2} />
}

function TechnicalCallouts({ hotspots, activeComponents, onFocus }: Pick<ViewerProps, 'hotspots' | 'activeComponents'> & { onFocus: (hotspot: F1TechHotspot) => void }) {
  const [hoveredId, setHoveredId] = useState<string>()
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>()
  return <>{hotspots.map((hotspot) => {
    const active = activeComponents.includes(hotspot.componentId); const selected = selectedHotspotId === hotspot.id; const hovered = hoveredId === hotspot.id
    const color = selected ? '#ffffff' : active || hovered ? '#9de6dc' : '#5f6674'; const labelClass = `garage-callout-label ${selected ? 'garage-callout-label--selected' : active ? 'garage-callout-label--active' : 'garage-callout-label--normal'}${hovered ? ' garage-callout-label--hovered' : ''}`
    return <group key={hotspot.id} position={hotspot.position}>
      <Line points={[[0, 0, 0], hotspot.calloutOffset]} color={color} lineWidth={1} transparent opacity={selected ? .92 : hovered ? .76 : active ? .48 : .22} />
      <Billboard><group onPointerOver={(event) => { event.stopPropagation(); setHoveredId(hotspot.id) }} onPointerOut={() => setHoveredId(undefined)} onClick={(event) => { event.stopPropagation(); setSelectedHotspotId(hotspot.id); onFocus(hotspot) }}><mesh><sphereGeometry args={[selected ? .065 : hovered || active ? .048 : .03, 16, 16]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>{selected && <mesh><ringGeometry args={[.09, .105, 24]} /><meshBasicMaterial color={color} transparent opacity={.62} side={2} toneMapped={false} /></mesh>}</group></Billboard>
      <Html position={hotspot.calloutOffset} center distanceFactor={9} zIndexRange={[10, 0]}><button type="button" className={labelClass} onMouseEnter={() => setHoveredId(hotspot.id)} onMouseLeave={() => setHoveredId(undefined)} onClick={(event) => { event.stopPropagation(); setSelectedHotspotId(hotspot.id); onFocus(hotspot) }}><i />{hotspot.label}</button></Html>
    </group>
  })}</>
}

export function ModelViewer({ asset, locale, cameraPreset, theme, hotspots, activeComponents, selectedHotspot, focusRequestId, showCallouts = true, onSelectComponent }: ViewerProps) {
  const mobile = useMobileViewer()
  const cameraPosition = useMemo<[number, number, number]>(() => {
    const position = asset.cameraPresets[cameraPreset]
    if (!mobile) return position
    return [position[0] * mobileCameraScale, .55 + (position[1] - .55) * mobileCameraScale, position[2] * mobileCameraScale]
  }, [asset, cameraPreset, mobile])
  const controlsRef = useRef<OrbitControlsImpl>(null); const [focusedHotspot, setFocusedHotspot] = useState<F1TechHotspot>()
  function focusHotspot(hotspot: F1TechHotspot) { onSelectComponent(hotspot.componentId); setFocusedHotspot(hotspot) }
  const inspectionHotspot = selectedHotspot ?? focusedHotspot
  const copy = garageText(locale)
  return <Canvas shadows gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: .96 }} camera={{ position: cameraPosition, fov: 40 }} dpr={[1, 1.5]}><color attach="background" args={['#07080b']} /><ambientLight intensity={.2} /><hemisphereLight args={['#91a4bb', '#090a0d', .48]} /><directionalLight castShadow position={[4.5, 7, 5]} intensity={2.8} color="#fff6eb" shadow-mapSize={[2048, 2048]} shadow-radius={8} shadow-bias={-.0001} /><directionalLight position={[-5, 2.5, 3]} intensity={.7} color="#a8c8ef" /><directionalLight position={[2.5, 4, -5]} intensity={1.25} color="#d5e0f0" /><Environment resolution={128}><Lightformer form="rect" intensity={2.6} color="#f6f8fc" position={[0, 6, 4]} scale={[9, 4, 1]} /><Lightformer form="rect" intensity={1.15} color="#b8d6f4" position={[-5, 2, 2]} scale={[4, 2, 1]} /><Lightformer form="rect" intensity={1.75} color="#e9edf4" position={[3, 3, -5]} scale={[5, 2, 1]} /></Environment><CameraPreset position={cameraPosition} /><ViewerErrorBoundary fallback={<Html center><span className="viewer-fallback">{copy.modelError}</span></Html>}><Suspense fallback={<Html center><span className="viewer-fallback">{copy.modelLoading}</span></Html>}><OriginalModel asset={asset} theme={theme} /></Suspense></ViewerErrorBoundary><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.3, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#121419" roughness={.82} metalness={.1} /></mesh><InspectionHighlight hotspot={inspectionHotspot} color={theme.accent} />{showCallouts && <TechnicalCallouts hotspots={hotspots} activeComponents={activeComponents} onFocus={focusHotspot} />}<CameraFocus hotspot={inspectionHotspot} controlsRef={controlsRef} requestId={focusRequestId} defaultPosition={cameraPosition} positionScale={mobile ? mobileCameraScale : 1} /><OrbitControls ref={controlsRef} enablePan={false} enableDamping dampingFactor={.08} rotateSpeed={.45} minDistance={3} maxDistance={15} minPolarAngle={.08} maxPolarAngle={Math.PI / 2.08} target={[0, .55, 0]} /></Canvas>
}
