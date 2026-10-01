# Component Focus reparado para Alpine GLB V2

Fecha: 2026-10-01. Rama `dev`, HEAD de inicio `269b5a8`. No commit, push ni deploy.

## Causa exacta

Los nombres, parents y tipos de Object3D del V2 **no cambiaron** respecto del V1. Tampoco cambiaron los geometry groups originales: siguen vacíos. La nueva exportación redistribuyó caras entre los tres materiales/primitivas de `Livery` y cambió vértices, orden de índices y conectividad de algunas islas.

El mapping conservaba cantidades y hashes V1. Las tres reglas de `Livery` fallaban con `geometry/material fingerprint mismatch`; el controlador invalidaba los componentes incompletos. `resolvedTargets.length === 0` desactivaba correctamente el aislamiento, mientras la cámara seguía respondiendo por su propio camino.

**No es un problema de clearcoat ni de MeshPhysicalMaterial.** No se modificó el renderer, el shader de aislamiento, ModelViewer ni el resolver.

La referencia local `main` contiene el mismo GLB V1 que la revisión `3a6a10a`: SHA-256 `6d1f8f5680ab4c627fb8e4b82fc089c5fe047ccb0c45961c3673d394c9a9fd03`. Se extrajo únicamente una copia diagnóstica a la carpeta ignorada `ingestion/output/`; nunca se copió a `public/models/`.

## Jerarquía y nombres reales

Inventario del GLB cargado por el mismo `three-stdlib/GLTFLoader` que usa Drei: 13 nodos, 9 meshes. Igual en V1 y V2:

```text
Scene (Group)
└─ F1_Concept_2026 (Object3D)
   ├─ carbon (Mesh, carbon_mat)
   ├─ cockpit (Mesh, cockpit_mat)
   ├─ Livery (Group)
   │  ├─ Mesh (Mesh, livery)
   │  ├─ Mesh_1 (Mesh, Alpine Pink)
   │  └─ Mesh_2 (Mesh, carbon_mat)
   └─ Wheels (Object3D)
      ├─ FL_Wheel (Mesh, Wheels)
      ├─ FR_Wheel (Mesh, Wheels)
      ├─ RL_Wheel (Mesh, Wheels)
      └─ RR_Wheel (Mesh, Wheels)
```

No aparecieron sufijos `.001`/`.002` nuevos. No fue necesario ampliar la normalización de nombres. El resolver existente encuentra un nodo único dentro del subtree del modelo y recorre todos sus descendientes; no exige parents directos específicos.

### Geometrías de Livery: V1 → V2

| Primitiva / material | Vértices V1 → V2 | Índices V1 → V2 | Islas indexadas V1 → V2 | Hash posiciones V2 | Hash índices V2 |
| --- | --- | --- | --- | --- | --- |
| 0 / livery | 46.380 → 46.384 | 236.892 → 236.988 | 175 → 175 | `35b56a9c` | `c126928c` |
| 1 / Alpine Pink | 17.468 → 14.568 | 88.401 → 73.923 | 90 → 84 | `3d61dc0b` | `2c86d2ed` |
| 2 / carbon_mat | 7.640 → 10.630 | 35.007 → 49.389 | 103 → 109 | `a2e7faa6` | `3dbd1fa1` |

Carbon principal, cockpit y ruedas conservan sus cantidades y huellas de geometría. Los 120.100 triángulos de Livery tienen correspondencia exacta por coordenadas con V1; no cambió la superficie física del coche.

Inventarios completos con bounds, parents, materiales y groups:

- [Comparación V1/V2 y diagnóstico anterior](../ingestion/output/alpine-v2-focus-before.json): bounds mundiales con la escala original del asset.
- [Inventario real del navegador](../ingestion/output/alpine-v2-component-focus-runtime.json): sección `source.inventory`, bounds mundiales con escala de visor 1.1, geometrías originales sin grupos; sección `inventory`, grupos runtime posteriores a aislamiento.

## Mapping final y transferencia auditada

Sólo se actualizó la entrada `alpine-a526-formulatech-evaluation` de `src/three/component-mesh-map.json`. La entrada BGRT permanece idéntica. Se conservan sus selectores carbon, objetos completos de ruedas/cockpit y composites.

Para reconstruir las reglas Livery se compararon los triángulos originales por sus coordenadas exactas, independientemente del material y de la numeración de índices. Cada isla V2 se aceptó sólo cuando **todos sus triángulos** tenían la misma pertenencia semántica auditada en V1. Resultado: cero conflictos, cero triángulos sin correspondencia y cero islas con pertenencias mezcladas.

El resultado se guardó como mapping explícito V2: primitiva, cantidades, hashes y selectores `firstTriangle + triangles` de islas completas. No se añadió transferencia dinámica, fuzzy matching ni cortes espaciales al runtime. Las comprobaciones estrictas de geometría siguen activas para rechazar un futuro asset incompatible.

| Regla final | Componentes mapeados |
| --- | --- |
| carbon / primitiva 0 | Piso, parte de alerones, suspensiones, frenos, difusor, cámara onboard |
| Livery / primitiva 0 / azul | Nariz, pontones, cubierta del motor, parte del halo, espejos |
| Livery / primitiva 1 / rosa | Alerón trasero, parte de nariz/halo/alerón delantero |
| Livery / primitiva 2 / carbono | Parte del alerón delantero, nariz y halo |
| Objetos completos | Cuatro ruedas, pares delantero/trasero y cockpit |
| Composites | Front Corner y Rear Corner |

[Mapping completo versionable](../src/three/component-mesh-map.json). [Evidencia de transferencia exacta](../ingestion/output/alpine-v2-mapping-transfer.json).

## Target count por componente

V1: referencia válida anterior. V2 antes: comprobado en CPU y navegador usando el mapping obsoleto. V2 final: comprobado en el visor compilado desde `dev`.

| componentId | V1 | V2 antes | V2 final | Nombres de meshes reales finales |
| --- | ---: | ---: | ---: | --- |
| front-wing / frontWing | 92 | **0** | **94** | carbon, Mesh_1, Mesh_2 |
| rear-wing / rearWing | 39 | **0** | **39** | carbon, Mesh_1 |
| floor | 7 | 7 | **7** | carbon |
| sidepod / sidepods | 10 | **0** | **8** | Mesh |
| nose | 21 | **0** | **21** | Mesh, Mesh_1, Mesh_2 |
| halo | 7 | **0** | **7** | Mesh, Mesh_1, Mesh_2 |
| engine-cover / engineCover | 8 | **0** | **8** | Mesh |
| front-suspension / frontSuspension | 32 | 32 | **32** | carbon |
| rear-suspension / rearSuspension | 16 | 16 | **16** | carbon |
| diffuser | 2 | 2 | **2** | carbon |
| wheels | 4 | 4 | **4** | FL_Wheel, FR_Wheel, RL_Wheel, RR_Wheel |
| mirrors | 30 | **0** | **30** | Mesh |
| onboardCamera | 12 | 12 | **12** | carbon |
| frontBrake | 32 | 32 | **32** | carbon |
| rearBrake | 24 | 24 | **24** | carbon |
| frontWheels | 2 | 2 | **2** | FL_Wheel, FR_Wheel |
| rearWheels | 2 | 2 | **2** | RL_Wheel, RR_Wheel |
| chassis | 1 | 1 | **1** | cockpit |
| frontCorner | 66 | 66 | **66** | carbon, FL_Wheel, FR_Wheel |
| rearCorner | 42 | 42 | **42** | carbon, RL_Wheel, RR_Wheel |

Los siete componentes que daban cero eran **frontWing, rearWing, nose, halo, sidepods, engineCover y mirrors**. El controlador invalidaba la pieza completa aunque alguna superficie carbon aún fuese válida.

94 frente a 92 en frontWing y 8 frente a 10 en sidepods cuentan islas/targets, no caras ni piezas nuevas. La redistribución divide o reúne fronteras de material. Se conserva exactamente la selección de triángulos de V1.

Refrigeración, Airbox publicado sin pieza independiente, Drum, Beam Wing y volante siguen sin targets específicos. La prueba de Refrigeración devuelve cero y deja todas las ganancias en 1. No se asigna una pieza distinta para simular soporte.

## Materiales V2 y sharing

El GLB V2 contiene `KHR_materials_clearcoat`. Ambos materiales de pintura llegan como `MeshPhysicalMaterial`:

| Material runtime | Color sRGB | Metalness | Roughness | Clearcoat | Clearcoat roughness | IOR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| livery | `#013c99` | 0 | 0.150000006 | 0.649999976 | 0.059999999 | 1.5 |
| Alpine Pink | `#e6007e` | 0 | 0.219999999 | 0.5 | 0.100000001 | 1.5 |

`envMapIntensity=1`, opacity 1 y transparent false en ambos. Carbon y ruedas conservan sus materiales Standard y texturas; cockpit conserva Physical.

No cambió la asociación de materials por nombre: `carbon` y `Mesh_2` comparten el material original carbon_mat; las cuatro ruedas comparten Wheels; Livery azul/rosa conserva un material por primitiva. La nueva exportación cambia qué caras pertenecen a cada pintura/carbono.

El controlador ya crea materiales privados por mesh y, para islas, por material/pertenencia semántica. No comparte un uniform de aislamiento entre una pieza seleccionada y otra superficie. Se comprobó tanto en materiales Standard como Physical: seleccionar A mantiene A=1 y B=0.28; seleccionar B invierte las ganancias; cerrar/restablecer deja ambas en 1. El material compartido original permanece intacto.

Los clones en el navegador coinciden con una carga nueva del GLB V2: color, emisivo, metalness, roughness, clearcoat, clearcoatRoughness, IOR, envMapIntensity, opacity, specular y todas las texturas/transformaciones. La comparación se repitió después de cambiar equipos. No hubo conversión a un material básico ni compensación de colores.

## QA Alpine y BGRT

40 casos automatizados en Edge/WebGL sobre el build de `dev`, con revisión de capturas. Desktop 1440 × 900 y viewport mobile 390 × 844; no se afirma una prueba en hardware móvil físico.

Alpine desktop se probó en Países Bajos (`dutch-2026`, tres publicaciones). Para cada pieza se accionó su botón real y se verificaron cámara, targets, uniforms CPU/GPU y propiedades PBR invariantes:

| Pieza | Targets | Cámara focus | Resto 28 % | Target 100 % |
| --- | ---: | --- | --- | --- |
| Alerón delantero | 94 | Sí | Sí | Sí |
| Alerón trasero | 39 | Sí | Sí | Sí |
| Piso | 7 | Sí, vista inferior | Sí | Sí |
| Pontones | 8 | Sí | Sí | Sí |
| Nariz | 21 | Sí | Sí | Sí |
| Halo | 7 | Sí | Sí | Sí |
| Cubierta del motor | 8 | Sí | Sí | Sí |
| Suspensión delantera | 32 | Sí | Sí | Sí |
| Suspensión trasera | 16 | Sí | Sí | Sí |
| Difusor | 2 | Sí, vista inferior | Sí | Sí |
| Ruedas y neumáticos | 4 | Sí | Sí | Sí |
| Cockpit | 1 | Sí | Sí | Sí |
| Frenos delanteros | 32 | Sí | Sí | Sí, visibilidad limitada por ruedas |
| Frenos traseros | 24 | Sí | Sí | Sí, visibilidad limitada por ruedas |
| Refrigeración | 0 | Mantiene comportamiento existente | No | No aislamiento |

La oclusión de frenos por las ruedas pertenece a la geometría/vista existente. Se conserva el gain del target, pero no se añadió un modo de rayos X ni se ocultaron ruedas para forzar visibilidad.

Alpine mobile: botones publicados de Difusor, Pontones y Alerón trasero en Países Bajos; Alerón delantero y trasero en Italia. Los cinco casos mantienen foco, target=1 y resto=0.28. Se comprobó cierre por ×, Restablecer y ausencia de desbordamiento horizontal. La UI mobile sólo ofrece las publicaciones del GP; no se añadieron controles para piezas no publicadas.

BGRT/McLaren: once piezas desktop, incluidos los ocho conjuntos principales, suspensiones y ruedas; ocho publicaciones mobile de Azerbaiyán. Se conservan pintura y shader por equipo. Branquias de refrigeración es el caso sin targets y no activa aislamiento. La entrada BGRT del JSON se comprobó idéntica a HEAD.

Restauración comprobada:

- A → B: A deja de estar destacada y pasa al brillo del resto; B queda al 100 %, sin modificar materiales base.
- Cerrar por el mismo botón desktop o × mobile: todas las ganancias vuelven a 1.
- Restablecer desktop/mobile: coche normal.
- Alpine enfocado → McLaren → Alpine: sin residuos, PBR y barniz V2 intactos.
- Cambio de GP y reload: modelo normal con mapping V2 válido.

Sin errores ni warnings de consola WebGL/shaders.

Capturas representativas:

- [Alpine V2 normal](../ingestion/output/alpine-v2-normal-desktop.png).
- [Alerón delantero desktop](../ingestion/output/alpine-v2-frontWing-desktop.png).
- [Halo desktop](../ingestion/output/alpine-v2-halo-desktop.png).
- [Piso desktop](../ingestion/output/alpine-v2-floor-desktop.png).
- [Difusor mobile](../ingestion/output/alpine-v2-alpine-diffuser-mobile-0.png).
- [Alerón delantero mobile](../ingestion/output/alpine-v2-alpine-frontWing-mobile-0.png).
- [McLaren normal](../ingestion/output/alpine-v2-bgrt-mclaren-normal-desktop.png).
- [McLaren Halo](../ingestion/output/alpine-v2-bgrt-mclaren-halo-desktop.png).

## Validación y archivos

- `npm run lint`: correcto.
- `npm test`: **119 tests correctos**, cero fallos y cero skips.
- `npm run build`: correcto; aviso existente de chunk mayor de 500 kB.
- `git diff --check`: correcto; archivos nuevos comprobados también por separado.
- QA runtime: **40 casos**, materiales preservados y cero errores/warnings.

Archivos modificados/nuevos:

1. `src/three/component-mesh-map.json`: únicamente la entrada Alpine, hashes/cantidades/selectores V2 y SHA del asset.
2. `tests/alpine-v2-component-focus.test.mjs`: regresión Standard/Physical con materiales compartidos; comprobación de pintura/clearcoat V2 durante todo el ciclo de componentes.
3. `docs/alpine-v2-component-focus-2026-10-01.md`: este informe.

`component-mapping.*`, `component-isolation.*`, `ModelViewer.tsx` y la entrada BGRT permanecen sin cambios. GLB, FIA/datasets, UI, selectores, cards, Netlify y workflows permanecen intactos.

**SHA-256 de Alpine V2, antes y después:**

`b0cff510d87ada36dc345f583fa8e25a74eaf4bf210f1c2f4ec4cff65dc7700b`

Evidencia completa: [runtime/QA](../ingestion/output/alpine-v2-component-focus-runtime.json), [comparación V1/V2](../ingestion/output/alpine-v2-focus-before.json), [transferencia](../ingestion/output/alpine-v2-mapping-transfer.json). Helpers y capturas están en `ingestion/output/`, ignorados por Git. No se incorporan al código de producción. Los servidores de QA se cerraron.

**No commit. No push. No deploy.**
