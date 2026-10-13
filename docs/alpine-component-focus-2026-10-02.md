# Auditoría e implementación Alpine Component Focus — 2 de octubre de 2026

Trabajo realizado en C:/Users/mb937/Desktop/f1-tech, rama dev. Los cambios quedan sin commit.

HEAD remoto inicial de dev: **4de03fac4933d80d164871cd52bfca207e3ce07f**.
HEAD local inicial: **4de03fac4933d80d164871cd52bfca207e3ce07f**. Checkout dev limpio y coincidente antes de modificar cualquier archivo. Consulta final remota/local: mismo SHA. No commit, push, merge ni deploy. No se operó sobre main.

## Archivo realmente auditado

public/models/alpine-a526-formulatech.glb. SHA-256: **a398ea532f3b6d71f434b5a86cfb6ef558019107ff71ac24fb4c87f99e7f90d6**. El GLB permanece sin cambios.

499 nodos runtime incluyendo Scene, 498 meshes y 13 materiales fuente. Este archivo NO es el Alpine de 13 nodos descrito por la auditoría antigua. Se usó el GLTFLoader real para jerarquía, matrices y geometría; la auditoría CPU omite solamente la decodificación de imágenes. La prueba WebGL separada sí decodifica las texturas originales.

El [inventario JSON completo](alpine-v2-inventory.json) incluye todos los nodes/meshes/materiales originales, transforms, bounds, triángulos, targets, fuentes PBR y evidencia de oclusión. El inventario legible entregado enumera los 498 meshes sin omitir variantes colapsadas. Quedan 401 superficies sin asignación semántica segura: unknown/manual-review. Una superficie no asignada NO demuestra ausencia de la pieza física.

## Cambios y comportamiento

- Un único gate Alpine resuelve materiales y cámara contra componentes realmente validados. Un fallo de fingerprint deja el coche normal. Las publicaciones y detalles FIA siguen independientes de la capacidad 3D.
- Cámaras Alpine independientes de los hotspots BGRT, incluso para selecciones FIA sin hotspot específico. Suspensión trasera desde atrás y más arriba para evitar el alerón; frontal desde arriba y delante. Encuadres de alerones centrados en sus bounds reales.
- Los ocho meshes explícitos TIRE_LF/RF/LR/RR se incorporaron con hashes exactos. Antes las llantas se iluminaban pero los neumáticos quedaban atenuados.
- Target externo conserva su ganancia 1; el contexto queda en 0.28. Un tinte cian suave y reversible (22 %) distingue el carbono oscuro. En ghost los radiadores tienen tinte 70 %, opacidad 1 y bypass de profundidad; el exterior conserva su textura/PBR y usa opacidad 0.10. No se abren agujeros ni se crean piezas internas.
- Materiales privados compartidos sólo si coinciden la identidad del material fuente y TODAS las pertenencias semánticas. 37 canales privados para 498 meshes; cero geometrías Alpine duplicadas. No hay materiales ni nodos nuevos por frame o selección. Cada clon se dispone una sola vez; se restauran referencias originales y flags.
- El FOV se restaura explícitamente (32° normal Alpine; 40° focus), además de posición y target. Reset desktop comprobado por igualdad exacta de posición/FOV con la vista inicial después de la transición. Mobile usa el factor de distancia existente.
- BGRT conserva su mapping exacto, su ruta de material por mesh, shader y cámaras existentes. Registro/selector de equipos intacto: Alpine sólo para Alpine, BGRT para todos los demás. Apex nunca se seleccionó ni fue fallback.

## Tabla completa

P = posición de cámara; T = target. Coordenadas mundiales incluyendo escala del visor 1.1. Los nombres enumerados son los targets exactos, no cortes espaciales inventados.

| Componente | Visualizable | Meshes asociados | Cámara | Comportamiento / evidencia pendiente |
| --- | --- | --- | --- | --- |
| Coche completo (car) | No | — | Estándar; sin foco | Vista completa / reset |
| Cockpit (chassis) | Sí | `GEO_GEN_COCKPIT_1_HR_81`<br>`GEO_GEN_COCKPIT_1_LR_287`<br>`GEO_GEN_COCKPIT_2_HR_82`<br>`GEO_GEN_COCKPIT_2_LR_288`<br>`GEO_INT_COCKPIT_1_HR_83`<br>`GEO_INT_COCKPIT_1_LR_289`<br>`GEO_INT_COCKPIT_2_HR_84`<br>`GEO_INT_COCKPIT_3_HR_493` | P [2.4,3,3]; T [0,0.55,0.65] | Target 100 %, tinte 22 %; contexto 28 % |
| Nariz (nose) | No | — | Estándar; sin foco | unknown/manual-review: generic BODY meshes combine surfaces |
| Alerón delantero (frontWing) | Sí | `GEO_CB1_FW_ENDPLATE_L_459`<br>`GEO_CB1_FW_ENDPLATE_R_463`<br>`GEO_EXT_FW_ATTACHMENT_471`<br>`GEO_EXT_FW_ENDPLATE_L_460`<br>`GEO_EXT_FW_ENDPLATE_R_464`<br>`GEO_MAIN_FRONTWING_SUB0_467`<br>`GEO_MAIN_FRONTWING_SUB1_468`<br>`GEO_MAIN_FRONTWING_SUB2_469`<br>`GEO_MAIN_FRONTWING_SUB3_470`<br>`GEO_MAIN_FW_ENDPLATE_L_462`<br>`GEO_MAIN_FW_ENDPLATE_R_466`<br>`GEO_MAIN_FW_STICKER_422` | P [2.6,2.1,5.2]; T [0,0.24,2.72] | Target 100 %, tinte 22 %; contexto 28 % |
| Suspensión delantera (frontSuspension) | Sí | `GEO_CB1_SUSP_LF_A_472`<br>`GEO_CB1_SUSP_LF_B_476`<br>`GEO_CB1_SUSP_LF_C_382`<br>`GEO_CB1_SUSP_LF_D_480`<br>`GEO_CB1_SUSP_RF_A_474`<br>`GEO_CB1_SUSP_RF_B_478`<br>`GEO_CB1_SUSP_RF_C_401`<br>`GEO_CB1_SUSP_RF_D_481`<br>`GEO_MAIN_SUSP_LF_A_473`<br>`GEO_MAIN_SUSP_LF_B_477`<br>`GEO_MAIN_SUSP_LF_C_383`<br>`GEO_MAIN_SUSP_RF_A_475`<br>`GEO_MAIN_SUSP_RF_B_479`<br>`GEO_MAIN_SUSP_RF_C_400` | P [-2.7,3.1,4.4]; T [0,0.49,1.76] | Target 100 %, tinte 22 %; contexto 28 % |
| Frenos delanteros (frontBrake) | No | — | Estándar; sin foco | unknown/manual-review: hubs are not evidence of independently identifiable brakes |
| Piso (floor) | No | — | Estándar; sin foco | unknown/manual-review |
| Pontones (sidepods) | No | — | Estándar; sin foco | unknown/manual-review |
| Refrigeración / radiadores (cooling) | Sí | `GEO_CB2_RADIATORS_492` | P [3.4,1.7,0.6]; T [0,0.225,-0.58] | Ghost reversible; target opaco y tinte 70 % |
| Cubierta del motor (engineCover) | No | — | Estándar; sin foco | unknown/manual-review |
| Caja de aire (airbox) | No | — | Estándar; sin foco | unsupported: no independently identified airbox; engineCover must not substitute for FIA Airbox |
| Suspensión trasera (rearSuspension) | Sí | `GEO_CB1_SUSP_LR_A_482`<br>`GEO_CB1_SUSP_LR_B_484`<br>`GEO_CB1_SUSP_LR_C_486`<br>`GEO_CB1_SUSP_LR_D_488`<br>`GEO_CB1_SUSP_RR_A_483`<br>`GEO_CB1_SUSP_RR_B_485`<br>`GEO_CB1_SUSP_RR_C_487`<br>`GEO_CB1_SUSP_RR_D_489` | P [-1.5,4.8,-4.2]; T [0,0.48,-1.75] | Target 100 %, tinte 22 %; contexto 28 % |
| Frenos traseros (rearBrake) | No | — | Estándar; sin foco | unknown/manual-review |
| Alerón trasero (rearWing) | Sí | `GEO_CB1_RW_450`<br>`GEO_CB1_RW_455`<br>`GEO_CB1_RW_SKINNED_495`<br>`GEO_EXT_DRS_1_423`<br>`GEO_EXT_DRS_2_425`<br>`GEO_EXT_DRS_3_426`<br>`GEO_EXT_DRS_4_424`<br>`GEO_EXT_DRS_5_428`<br>`GEO_GEN_DRS_1_427`<br>`GEO_GEN_DRS_2_429`<br>`GEO_GEN_RW_452`<br>`GEO_GEN_SCREWS_DRS_430`<br>`GEO_GEN_SCREWS_RW_451`<br>`GEO_MAIN_DRS_431`<br>`GEO_MAIN_REARWING_453`<br>`GEO_MAIN_STICKERS_DRS_432`<br>`GEO_MAIN_STICKERS_RW_454`<br>`GEO_MAIN_STICKERS_RW_B_457` | P [2.5,2.2,-5.2]; T [0,0.94,-2.35] | Target 100 %, tinte 22 %; contexto 28 % |
| Difusor (diffuser) | No | — | Estándar; sin foco | unknown/manual-review |
| Ruedas y neumáticos (wheels) | Sí | `GEO_WHEEL_BLUR_A_LF_376`<br>`GEO_WHEEL_BLUR_A_RF_394`<br>`GEO_WHEEL_BLUR_B_LF_377`<br>`GEO_WHEEL_BLUR_B_RF_395`<br>`GEO_WHEEL_FIXED_LF_375`<br>`GEO_WHEEL_FIXED_RF_393`<br>`GEO_WHEEL_STATIC_LF_378`<br>`GEO_WHEEL_STATIC_RF_396`<br>`TIRE_LF_SUB0_380`<br>`TIRE_LF_SUB1_379`<br>`TIRE_RF_SUB0_398`<br>`TIRE_RF_SUB1_397`<br>`GEO_WHEEL_BLUR_A_LR_386`<br>`GEO_WHEEL_BLUR_A_RR_404`<br>`GEO_WHEEL_BLUR_B_LR_387`<br>`GEO_WHEEL_BLUR_B_RR_405`<br>`GEO_WHEEL_FIXED_LR_385`<br>`GEO_WHEEL_FIXED_RR_403`<br>`GEO_WHEEL_STATIC_LR_388`<br>`GEO_WHEEL_STATIC_RR_406`<br>`TIRE_LR_SUB0_390`<br>`TIRE_LR_SUB1_389`<br>`TIRE_RR_SUB0_408`<br>`TIRE_RR_SUB1_407` | P [4,2.5,4.5]; T [0,0.39,0] | Target 100 %, tinte 22 %; contexto 28 % |
| Volante (steeringWheel) | No | — | Estándar; sin foco | unknown/manual-review: AL-labelled variants collapsed to micrometre size |
| Halo (halo) | Sí | `GEO_MAIN_HALO_HR_86`<br>`GEO_MAIN_HALO_LR_290`<br>`GEO_MAIN_STICKER_HALO_HR_87`<br>`GEO_MAIN_STICKER_HALO_LR_291` | P [-2.5,3,3]; T [0,0.9,0.4] | Target 100 %, tinte 22 %; contexto 28 % |
| Espejos (mirrors) | Sí | `MIRROR_L_370`<br>`MIRROR_R_371` | P [2.7,2.3,3.4]; T [0,0.8,0.72] | Target 100 %, tinte 22 %; contexto 28 % |
| Conjunto delantero (frontCorner) | Sí | `GEO_CB1_HUB_LF_381`<br>`GEO_CB1_HUB_RF_399`<br>`GEO_MAIN_HUB_LF_384`<br>`GEO_MAIN_HUB_RF_402`<br>`GEO_CB1_SUSP_LF_A_472`<br>`GEO_CB1_SUSP_LF_B_476`<br>`GEO_CB1_SUSP_LF_C_382`<br>`GEO_CB1_SUSP_LF_D_480`<br>`GEO_CB1_SUSP_RF_A_474`<br>`GEO_CB1_SUSP_RF_B_478`<br>`GEO_CB1_SUSP_RF_C_401`<br>`GEO_CB1_SUSP_RF_D_481`<br>`GEO_MAIN_SUSP_LF_A_473`<br>`GEO_MAIN_SUSP_LF_B_477`<br>`GEO_MAIN_SUSP_LF_C_383`<br>`GEO_MAIN_SUSP_RF_A_475`<br>`GEO_MAIN_SUSP_RF_B_479`<br>`GEO_MAIN_SUSP_RF_C_400`<br>`GEO_WHEEL_BLUR_A_LF_376`<br>`GEO_WHEEL_BLUR_A_RF_394`<br>`GEO_WHEEL_BLUR_B_LF_377`<br>`GEO_WHEEL_BLUR_B_RF_395`<br>`GEO_WHEEL_FIXED_LF_375`<br>`GEO_WHEEL_FIXED_RF_393`<br>`GEO_WHEEL_STATIC_LF_378`<br>`GEO_WHEEL_STATIC_RF_396`<br>`TIRE_LF_SUB0_380`<br>`TIRE_LF_SUB1_379`<br>`TIRE_RF_SUB0_398`<br>`TIRE_RF_SUB1_397` | P [-2.7,3.1,4.4]; T [0,0.49,1.76] | Target 100 %, tinte 22 %; contexto 28 % |
| Conjunto trasero (rearCorner) | Sí | `GEO_CB1_HUB_LR_391`<br>`GEO_CB1_HUB_RR_409`<br>`GEO_CB1_SUSP_LR_A_482`<br>`GEO_CB1_SUSP_LR_B_484`<br>`GEO_CB1_SUSP_LR_C_486`<br>`GEO_CB1_SUSP_LR_D_488`<br>`GEO_CB1_SUSP_RR_A_483`<br>`GEO_CB1_SUSP_RR_B_485`<br>`GEO_CB1_SUSP_RR_C_487`<br>`GEO_CB1_SUSP_RR_D_489`<br>`GEO_WHEEL_BLUR_A_LR_386`<br>`GEO_WHEEL_BLUR_A_RR_404`<br>`GEO_WHEEL_BLUR_B_LR_387`<br>`GEO_WHEEL_BLUR_B_RR_405`<br>`GEO_WHEEL_FIXED_LR_385`<br>`GEO_WHEEL_FIXED_RR_403`<br>`GEO_WHEEL_STATIC_LR_388`<br>`GEO_WHEEL_STATIC_RR_406`<br>`TIRE_LR_SUB0_390`<br>`TIRE_LR_SUB1_389`<br>`TIRE_RR_SUB0_408`<br>`TIRE_RR_SUB1_407` | P [-1.5,4.8,-4.2]; T [0,0.48,-1.75] | Target 100 %, tinte 22 %; contexto 28 % |
| Ruedas delanteras (frontWheels) | Sí | `GEO_WHEEL_BLUR_A_LF_376`<br>`GEO_WHEEL_BLUR_A_RF_394`<br>`GEO_WHEEL_BLUR_B_LF_377`<br>`GEO_WHEEL_BLUR_B_RF_395`<br>`GEO_WHEEL_FIXED_LF_375`<br>`GEO_WHEEL_FIXED_RF_393`<br>`GEO_WHEEL_STATIC_LF_378`<br>`GEO_WHEEL_STATIC_RF_396`<br>`TIRE_LF_SUB0_380`<br>`TIRE_LF_SUB1_379`<br>`TIRE_RF_SUB0_398`<br>`TIRE_RF_SUB1_397` | P [3.2,2.5,4.3]; T [0,0.39,1.87] | Target 100 %, tinte 22 %; contexto 28 % |
| Ruedas traseras (rearWheels) | Sí | `GEO_WHEEL_BLUR_A_LR_386`<br>`GEO_WHEEL_BLUR_A_RR_404`<br>`GEO_WHEEL_BLUR_B_LR_387`<br>`GEO_WHEEL_BLUR_B_RR_405`<br>`GEO_WHEEL_FIXED_LR_385`<br>`GEO_WHEEL_FIXED_RR_403`<br>`GEO_WHEEL_STATIC_LR_388`<br>`GEO_WHEEL_STATIC_RR_406`<br>`TIRE_LR_SUB0_390`<br>`TIRE_LR_SUB1_389`<br>`TIRE_RR_SUB0_408`<br>`TIRE_RR_SUB1_407` | P [3.2,2.5,-4.3]; T [0,0.39,-1.87] | Target 100 %, tinte 22 %; contexto 28 % |
| Cámara onboard (onboardCamera) | No | — | Estándar; sin foco | unsupported: no confidently identified independent onboard camera |
| Front Drum (frontDrum) | No | — | Estándar; sin foco | Unsupported: sin pieza independiente identificada; detalle FIA conservado |
| Rear Drum (rearDrum) | No | — | Estándar; sin foco | Unsupported: sin pieza independiente identificada; detalle FIA conservado |
| Beam Wing (beamWing) | No | — | Estándar; sin foco | Unsupported: sin pieza independiente identificada; detalle FIA conservado |
| Branquias de refrigeración (coolingLouvres) | No | — | Estándar; sin foco | Unsupported: sin pieza independiente identificada; detalle FIA conservado |

## Aliases y evidencia de mapping

Se normalizan mayúsculas y separadores; no se equiparan Drum, Corner y Suspension. Airbox, Beam Wing y Cooling Louvres/Louvers no se convierten a una categoría vecina para fabricar soporte.

- frontWing: Front Wing, Front Wing Endplate
- rearWing: Rear Wing, Rear Wing Endplate
- floor: Floor, Floor Edge, Floor Body, Floor Fences, Floor Leading Edge Devices
- sidepods: Sidepod, Sidepods, Sidepod Inlet
- engineCover: Engine Cover, Coke Engine Cover
- cooling: Cooling, Radiators
- chassis: Cockpit, Chassis
- frontSuspension: Front Suspension
- rearSuspension: Rear Suspension
- frontBrake: Front Brake
- rearBrake: Rear Brake
- frontCorner: Front Corner
- rearCorner: Rear Corner
- wheels: Wheels, Wheels Tyres
- mirrors: Mirror, Mirrors
- onboardCamera: Onboard Camera, TV Camera

Identificación por nombres explícitos y verificación de bounds/escala: FRONTWING/FW_ENDPLATE/FW_ATTACHMENT/FW_STICKER; REARWING/RW/DRS; HALO; SUSP_LF/RF y SUSP_LR/RR; MIRROR_L/R; WHEEL y TIRE por corner; COCKPIT; RADIATORS. Cada selector de objeto tiene hash de posiciones e índices. Los composites requieren todos sus constituyentes y deduplican targets. Front/Rear Corner incluyen hubs explícitos además de brazos y ruedas/neumáticos: el hub NO se presenta como disco o pinza de freno.

BODY, CB1/CB2 y B1/B2 mezclan regiones y no bastan para asignar nariz, pontones, cubierta, airbox, piso o difusor. No se añadieron cajas espaciales que corten triángulos ni mappings por parecido. Variantes microscópicas no se aceptan como evidencia útil. La regla de integridad ya existente sigue rechazando un GLB futuro incompatible.

## Geometría interna realmente encontrada

- GEO_CB2_RADIATORS_492: 56 vértices, 48 triángulos, x ±0.5524, y 0.1643–0.2457, z -0.5899–-0.4756 antes de escala. Ocho de ocho rayos laterales de muestra son bloqueados por geometría original. Es un radiator mesh muy simplificado, no una representación detallada de circuitos internos.
- Ocho superficies nombradas COCKPIT (GEN/INT, HR/LR), incluidos interior y superficies externas del habitáculo. El mapping chassis significa cockpit; no demuestra un monocasco estructural completo.
- Pedales GEO_BRAKE_PEDAL_1_17 / _2_16 y GEO_GAS_PEDAL_1_80 / _2_79: geometría de tamaño útil; no tienen categoría UI propia.
- INT_HR_steering_column_124 e INT_LR_steering_column_294: columnas de dirección reales. Hay meshes de volante GEO_SW_ME_* / LR_GEO_SW_ME_*; la variante etiquetada AL está colapsada. No se reasigna una variante ME como volante Alpine sin auditoría visual adicional.
- GEO_SUSP_B_490, GEO_SUSP_MAIN_B_491 y GEO_SUSP_SKINNED_SUB* contienen superficies adicionales de suspensión central/mixta; no se agregan enteras a un corner por mezclar regiones. Los brazos SUSP_LF/RF/LR/RR independientes sí se enfocan.
- Hubs de los cuatro corners: presentes. No se encontró evidencia suficiente de discos/pinzas independientes para Front/Rear Brake. GEO_GEN_ENGINE_AL está colapsado y no acredita motor interno utilizable.

## Refrigeración

Se conserva y mejora el ghost de los radiadores reales. No se implementó flujo de aire ni geometría interna inventada: existe target real y las partículas no aportan una identificación más fiable. Tampoco se afirma un resultado CFD. Branquias de refrigeración sigue unsupported y conserva coche normal y texto factual.

## Livery y restauración

Se conserva el loader existente que limita proporcionalmente el atlas PNG 9216×3072 a 4096×1365 y detecta un map faltante antes de cachear un GLTF blanco. Se reprodujo el fallo controlado de ImageBitmap y se verificó recuperación con el loader protegido. No se modificó el loader ni iluminación, exposición, fondos o livery global.

Los clones conservan maps, canales UV, color space, roughness/metalness/normal y parámetros PBR. El tinte vive en un uniform adicional, vuelve a cero y no escribe colores ni texturas base. Los clones comparten las texturas fuente sin disponerlas. Selección A→B, ghost→external→unsupported→reset y remounts repetidos mantienen los originales; cambiar GP/idioma/equipo y recargar se verificó también en el navegador.

## Archivos modificados / nuevos

1. src/three/ModelViewer.tsx — gate Alpine, cámaras independientes y restauración FOV.
2. src/three/alpine-focus.mjs — vistas Alpine y resolución segura.
3. src/three/alpine-focus.d.mts — contrato tipado.
4. src/three/component-isolation.mjs — pooling Alpine y tinte uniforme reversible.
5. src/three/component-isolation.d.mts — diagnóstico focusTint.
6. src/three/component-mesh-map.json — sólo Alpine: neumáticos, fingerprints y notas unsupported.
7. tests/alpine-focus-robustness.test.mjs — encuadres de todos los targets, unsupported, reset de tinte, pooling, ausencia de recompilación en selección externa y dispose único.
8. docs/alpine-v2-inventory.json — inventario actualizado con neumáticos.
9. docs/alpine-component-focus-2026-10-02.md — este informe.

## Pruebas y evidencia

- Baseline anterior a cambios: 154 tests aprobados.
- Suite completa final: 157 aprobados, 0 fallos, 0 skips.
- Nuevas regresiones: 3/3 aprobadas después del último ajuste de cámara. Incluyen cada target de las 13 categorías en el frustum desktop y fallo cerrado de categorías unsupported.
- Typecheck: npx tsc -b --pretty false aprobado. Build: npm run build aprobado. Lint: npm run lint aprobado. git diff --check aprobado.
- Edge/WebGL sobre build final local: 8 focos expuestos + 6 categorías unsupported, reset exacto y 5 ciclos ghost/suspensión/reset. Sin errores de página. Capturas revisadas de alerón, suspensión trasera y refrigeración.
- Recursos renderer estables durante ciclos: 513 geometrías y 15 texturas; programas estabilizados tras primer ghost. No hay crecimiento con las selecciones repetidas. No es una prueba universal de ausencia de leaks ni un benchmark de FPS.
- Regresión livery final real: decodificación de atlas con fallo controlado, escritorio 1440×1000 y viewport móvil 390×844; cambios GP, cámara, equipo, idioma, reset y reload aprobados. BGRT/Ferrari conserva su material visual.
- Evidencia entregada: browser-final/focus-results.json y capturas; livery-final/results.json y capturas. Inventario reproducible: node scripts/alpine-inventory.mjs.

La primera prueba de QA en los puertos habituales encontró servidores ya existentes; por eso el build final se validó en servidores propios 4187/5187. Carga de la app dev tuvo respuestas HTTP 403 en dependencias optimizadas de Vite; la auditoría de cámara/renderer usó el build local y pasó. No hubo fallo de infraestructura en suite/typecheck/build. El build conserva el aviso previo de chunks mayores a 500 kB. El entorno aislado tampoco podía iniciar procesos; las operaciones locales se ejecutaron con permisos revisados automáticamente.

## Riesgos y pendientes reales

Nariz, piso, pontones, cubierta, difusor y airbox requieren separación semántica en el asset o una auditoría adicional de sus islas con evidencia visual. Hasta entonces no se destacan ni reciben cámaras falsas. Frenos tampoco se deducen de hubs.

Ghost muestra la geometría muy simplificada de radiadores tal como existe y puede tener superposición de superficies transparentes. No se alteran renderOrder ni caras originales. La selección de suspensiones no revela piezas ocultas no mapeadas. No se recibió la imagen original de referencia de la vista trasera en este contexto: el encuadre se calibró con geometría y capturas actuales.

La prueba móvil es una emulación de viewport, no hardware móvil real. No se midió FPS en GPU de gama baja ni estabilidad durante horas. Variantes HR/LR y meshes colapsados originales se conservan. No se alteró el GLB ni se eliminó geometría pesada.
