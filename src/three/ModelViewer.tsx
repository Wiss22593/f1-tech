import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { CameraPresetId, F1TechCarAsset } from './assets'

class ViewerErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* El estado visual evita fallar toda la aplicación. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function CameraPreset({ position }: { position: [number, number, number] }) {
  const { camera } = useThree()
  useEffect(() => { camera.position.set(...position); camera.lookAt(0, 0, 0) }, [camera, position])
  return null
}

function OriginalModel({ asset }: { asset: F1TechCarAsset }) {
  const { scene } = useGLTF(asset.path)
  return <primitive object={scene} scale={asset.scale} rotation={asset.rotation} />
}

export function ModelViewer({ asset, cameraPreset }: { asset: F1TechCarAsset; cameraPreset: CameraPresetId }) {
  return <Canvas camera={{ position: asset.cameraPresets[cameraPreset], fov: 38 }} dpr={[1, 1.5]}><color attach="background" args={['#0b0c11']} /><ambientLight intensity={.7} /><directionalLight position={[5, 8, 4]} intensity={2.4} /><CameraPreset position={asset.cameraPresets[cameraPreset]} /><ViewerErrorBoundary fallback={<Html center><span className="viewer-fallback">No se pudo cargar el modelo original.</span></Html>}><Suspense fallback={<Html center><span className="viewer-fallback">Cargando modelo original…</span></Html>}><OriginalModel asset={asset} /></Suspense></ViewerErrorBoundary><OrbitControls enablePan={false} minDistance={2} maxDistance={12} /></Canvas>
}
