# F1 TECH

F1 TECH es una plataforma independiente de análisis técnico pre-race. Ordena señales de desarrollo, actualizaciones, objetivos técnicos y compatibilidad con el circuito antes de un Gran Premio; no es un medio de noticias generalista.

## Stack y comandos

- React 19, TypeScript estricto y Vite.
- Three.js, React Three Fiber y Drei para el pipeline 3D.
- ESLint para análisis estático.

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Arquitectura

```
src/
├── app/          navegación y composición
├── components/   piezas reutilizables de interfaz
├── data/demo/    datos marcados DEMO
├── domain/       tipos y cálculos de negocio
├── features/     Preview, Equipos, Actualizaciones, Garage y Circuitos
├── providers/    contratos y proveedor DEMO
├── three/        manifest y viewer de modelos originales
└── i18n/         catálogos y fallback de idiomas
```

`DemoProvider` es la única fuente conectada actualmente. `FiaProvider` y `PublicDocumentsProvider` son contratos preparados; no hacen scraping ni llamadas a APIs. Los datos futuros deben incluir fuente, URL cuando exista, confianza, fecha de verificación y trazabilidad.

## Estados y métricas

Las actualizaciones admiten `ANNOUNCED`, `SUBMITTED`, `TESTED`, `RUNNING` y `RACE_SPEC`. `TESTED` y `RACE_SPEC` son estados distintos por diseño. F1 TECH Score es una métrica propia basada en Aerodynamics, Magnitude, Circuit Fit, Development Rate y Confidence; no es una clasificación oficial.

## Idiomas

El idioma por defecto es español. La API de localización acepta `es`, `en`, `it`, `pt`, `fr` y `de`; los catálogos futuros se agregan a `src/i18n` sin cambiar los componentes.

## 3D Garage: modelo original de F1 TECH

El Garage no muestra una aproximación genérica de un monoplaza. El registry en `src/three/assets.ts` está vacío deliberadamente hasta que exista un asset **ORIGINAL de F1 TECH**. El viewer soporta carga de `/public/models/*.glb` o `/public/models/*.gltf`, loading, error state, orbit/zoom y presets de cámara cuando se registra un asset.

Cada asset debe usar `F1TechCarAsset` y declarar scale, rotation, hotspots, materiales y camera presets. Convención recomendada de nodes: `car`, `chassis`, `nose`, `frontWing`, `frontSuspension`, `frontBrake`, `floor`, `sidepods`, `cooling`, `engineCover`, `rearSuspension`, `rearBrake`, `rearWing`, `diffuser`, `wheels`, `steeringWheel`, `halo`.

Los hotspots deben venir del manifest, nunca estar hardcodeados en la geometría. Esto permitirá componente seleccionado, labels, panel técnico, Before/After, Circuit Fit, F1 TECH Score, overlays, ocultación y exploded view.

No agregar, copiar, convertir ni redistribuir Formula Alpha, VRC, Assetto Corsa, `.kn5`, texturas, skins, materiales, logos ni otros assets de terceros. Todo modelo, material, textura y nomenclatura futura debe ser propio de F1 TECH o estar licenciado de forma verificable.

## Legal y DEMO

F1 TECH es un proyecto independiente y no está afiliado, patrocinado ni respaldado por Formula 1, FIA ni los equipos de Formula 1. No se incluyen logos, fotografías, tipografías oficiales, modelos ni assets oficiales.

Todo valor no verificado se marca explícitamente como **DEMO**. No hay resultados, pilotos, nombres de coches, fechas, fuentes oficiales ni actualizaciones reales conectadas en esta etapa.
