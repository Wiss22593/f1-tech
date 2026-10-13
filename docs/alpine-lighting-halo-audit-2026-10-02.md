# Formula Tech — iluminación anterior, halo Alpine y candidatos Blender

Fecha: 2 de octubre de 2026. Rama de trabajo: dev.

## Estado inicial verificado antes de modificar

- HEAD remoto real de dev (git ls-remote): **91fe20961eca1b437fc99768b4ab52a07fee71a1**.
- HEAD local: **91fe20961eca1b437fc99768b4ab52a07fee71a1**; checkout limpio, rama dev.
- Última implementación: Complete Alpine Component Focus mapping.
- Estado anterior conocido: **4de03fac4933d80d164871cd52bfca207e3ce07f**.
- main observado, sin operaciones sobre ella: **7c0aa7d7ceeb200a4a5e2db73b7479624f896ae4**.
- GLB sin modificación: SHA256 **a398ea532f3b6d71f434b5a86cfb6ef558019107ff71ac24fb4c87f99e7f90d6**.
- Sin commit, push, merge ni deploy. Apex no se seleccionó, cargó ni utilizó como fallback.

## Iluminación: hallazgo y restauración real

La comparación del último commit con su padre no mostró cambios de luces, exposición, tone mapping, environment, fondo, sombras ni parámetros PBR globales. ModelViewer.tsx conserva ACESFilmicToneMapping, exposición authored 0.8315, hemisphere 2.4, directional 3.2 y environmentIntensity 0.5. También se conserva el tratamiento de sombras anterior en component-isolation.mjs. Por tanto, no se inventó una reversión de iluminación global inexistente.

Comparación WebGL local del estado anterior y HEAD inicial, mismo navegador/viewport/cámara sin foco: sólo **84/1.440.000 píxeles** difieren; máximo 13/255. Las capturas muestran la misma apariencia general. Esto es evidencia limitada a esa vista y navegador, no igualdad bit a bit universal.

Sí cambió **src/three/component-isolation.mjs**: la implementación añadía mezcla cian vec3(0.35,0.85,1.0), 22% en foco exterior y 70% en ghost. Se retiró ese tinte de todos los componentes. Las piezas enfocadas y radiadores vuelven a sus colores authored; el contexto mantiene el gain 0.28 que ya existía antes. Se conservan pooling, transiciones, cámaras, gate seguro y ghost. No se modificó ModelViewer.tsx ni authored-livery.mjs.

Excepción localizada necesaria para el objetivo Halo: el aro lleva acabado negro, imposible de hacer legible con un multiplicador de brillo. Sólo mientras Halo Alpine está seleccionado se aplica contraste neutro blanco del 12% a sus superficies confirmadas. No afecta otras selecciones, equipos ni vista normal; reset/unsupported lo llevan exactamente a cero. Los materiales/texturas fuente nunca se editan. Diagnóstico focusTint queda en cero; haloContrast identifica este efecto separado.

No se intentó replicar Content Manager ni se cambió una luz global.

## Halo completo y exclusión de vecinos

Los cuatro objetos llamados HALO contienen sólo el soporte central: x ±0.039, y 0.681–0.857, z 0.759–1.008 antes de escala. El aro real está en BODY_3; además sus stickers están en STICKERS_368 y podían ocultar el foco de la base al permanecer oscurecidos.

Se verificaron visualmente aro exterior/interior, insertos simétricos y uniones centrales como islas originales completas. Las islas del aro ocupan x ±0.333, y 0.738–0.917, z -0.137–0.816. Las capas de stickers coinciden espacialmente con el aro y fueron renderizadas separadamente. No se seleccionan espejos, borde del cockpit ni stickers vecinos. No se cortan superficies mediante cajas espaciales.

| Mesh exacto | Selección (firstTriangle / triangles) | Triángulos | Material |
|---|---|---:|---|
| `GEO_MAIN_HALO_HR_86` | Completo | 2708 | MAIN_BODY_ALPINE_FINAL |
| `GEO_MAIN_HALO_LR_290` | Completo | 2708 | MAIN_BODY_ALPINE_FINAL |
| `GEO_MAIN_STICKER_HALO_HR_87` | Completo | 990 | MAIN_STICKERS_ALPINE |
| `GEO_MAIN_STICKER_HALO_LR_291` | Completo | 990 | MAIN_STICKERS_ALPINE |
| `GEO_MAIN_BODY_3_366` | 0 / 3954; 33 / 3688; 77 / 247; 16605 / 247; 3779 / 228; 20307 / 228 | 8592 seleccionados | MAIN_BODY_ALPINE_FINAL |
| `GEO_MAIN_STICKERS_368` | 2398 / 3502; 6642 / 575; 16423 / 575 | 4652 seleccionados | MAIN_STICKERS_ALPINE |

Total: **6 meshes, 13 targets**, incluidos 9 grupos de islas y 4 objetos completos. Los dos objetos mixtos conservan todos sus triángulos y winding al repartirse en grupos de materiales; geometrías y materiales originales se restauran al desmontar. Cada regla tiene hashes de posiciones/índices y conteos. Un cambio incompatible en el GLB deshabilita el Halo completo.

Los números firstTriangle son identificadores del índice original GLTF, no números de cara garantizados tras importar/exportar Blender. No usar esos números para cortar o editar el asset.

## Auditoría exhaustiva y clasificación

Se recorrieron **499 nodos / 498 meshes**, materiales, transformaciones, jerarquía, bounds, centros y **1.882 islas soldadas a precisión 1e6**; se examinaron también islas indexadas sin soldar para distinguir superficies coincidentes del halo. La jerarquía visible es mayormente plana, con nombres heredados y variantes HR/LR o de equipos que comparten materiales. Muchos objetos genéricos mezclan regiones; simetría/proximidad se usó como evidencia de candidatos, nunca como autorización para mapear por sí sola.

### mapped_confidently

| Categorías | Resultado |
|---|---|
| frontWing, rearWing | Mappings existentes preservados |
| halo | Corregido: aro, uniones, soporte central y capas de stickers |
| frontSuspension, rearSuspension | Brazos identificados existentes; cámaras preservadas |
| cooling | Radiadores reales existentes con ghost; no se inventan mecanismos |
| chassis | Cockpit existente; no acredita monocasco estructural completo |
| mirrors | Espejos identificados existentes |
| frontWheels, rearWheels, wheels | Ruedas/neumáticos y compuesto existentes |
| frontCorner, rearCorner | Compuestos existentes; hubs no se convierten en frenos |

### ambiguous_candidates — selección manual en Blender

Los nombres siguientes son exactos del GLB. Son candidatos para revisar, **no mappings aprobados**. Elegir una región de un objeto mixto no confirma automáticamente todo ese objeto.

| Categoría | Estado | Objetos/meshes candidatos exactos |
|---|---|---|
| nose | `ambiguous_candidates` | `GEO_MAIN_BODY_1_362`<br>`GEO_MAIN_BODY_1B_363`<br>`GEO_CB1_1_344` |
| floor | `ambiguous_candidates` | `GEO_CB1_1_344`<br>`GEO_CB1_3_346`<br>`GEO_GEN_2_354` |
| diffuser | `ambiguous_candidates` | `GEO_CB1_1_344`<br>`GEO_CB1_3_346`<br>`GEO_GEN_1_353` |
| sidepods | `ambiguous_candidates` | `GEO_MAIN_BODY_2_364`<br>`GEO_CB1_2_345`<br>`GEO_CB2_2_348`<br>`GEO_MAIN_STICKERS_368` |
| engineCover | `ambiguous_candidates` | `GEO_MAIN_BODY_2_364`<br>`GEO_CB1_2_345`<br>`GEO_EXT_1_350`<br>`GEO_MAIN_STICKERS_368` |
| airbox | `ambiguous_candidates` | `GEO_MAIN_BODY_2_364`<br>`GEO_CB2_2_348`<br>`GEO_CB1_2_345` |
| frontBrake | `ambiguous_candidates` | `GEO_CB1_HUB_LF_381`<br>`GEO_CB1_HUB_RF_399`<br>`GEO_SUSP_SKINNED_SUB1_497` |
| rearBrake | `ambiguous_candidates` | `GEO_CB1_HUB_LR_391`<br>`GEO_CB1_HUB_RR_409`<br>`GEO_SUSP_SKINNED_SUB1_497` |
| frontDrum | `ambiguous_candidates` | `GEO_CB1_HUB_LF_381`<br>`GEO_CB1_HUB_RF_399` |
| rearDrum | `ambiguous_candidates` | `GEO_CB1_HUB_LR_391`<br>`GEO_CB1_HUB_RR_409` |
| beamWing | `ambiguous_candidates` | `GEO_MAIN_REARWING_453`<br>`GEO_CB1_RW_SKINNED_495`<br>`GEO_CB1_RW_455` |
| coolingLouvres | `ambiguous_candidates` | `GEO_EXT_VENTS_1A_410`<br>`GEO_MAIN_VENTS_1A_411`<br>`GEO_EXT_VENTS_1B_412`<br>`GEO_MAIN_VENTS_1B_413` |
| onboardCamera | `ambiguous_candidates` | `GEO_CB1_4_347`<br>`GEO_MAIN_BODY_4_367`<br>`GEO_EXT_4_351` |
| steeringWheel | `ambiguous_candidates` | `GEO_SW_ME_A_219`<br>`GEO_SW_ME_B_220`<br>`LR_GEO_SW_ME_A_315`<br>`LR_GEO_SW_ME_B_316` |

- Nariz: BODY_1 une superficies de nariz y carrocería frontal; BODY_1B y CB1_1 son superficies adyacentes/capas. Hace falta distinguir la pieza y sus límites, no destacar entero el coche frontal.
- Piso/difusor: CB1_1 cruza casi toda la longitud y CB1_3 tiene islas bajas simétricas/fences y apéndices traseros. GEN_2 incluye una placa central inferior, GEN_1 elementos traseros. No se sabe qué conjunto completo corresponde a cada categoría FIA.
- Pontones/cubierta/airbox: BODY_2 es una superficie conectada de x ±0.714, y 0.149–1.038, z -1.617–0.479; une varias zonas. CB1_2/CB2_2 y EXT_1 aportan capas/elementos adyacentes, sin nombres semánticos inequívocos.
- Frenos/drums: hubs por corner y superficies de suspensión mezcladas tienen candidatos, pero no un disco/pinza independiente confirmado. No se presentan hubs como frenos. Los pedales BRAKE_PEDAL son pedales, no targets de Front Brake.
- Beam Wing: objetos RW mezclan alerón y soportes con superficies a distintas alturas. Requiere identificar la pieza y distinguir soportes/alerón principal.
- Cooling Louvres: VENTS_1A/1B son pares simétricos activos y hay capas pintadas/externas; falta confirmar visualmente cuáles son las branquias solicitadas frente a otras aberturas o insertos. Las variantes VENTS_2A/2B están colapsadas y se excluyen.
- Onboard: BODY_4/CB1_4 en la zona alta sobre airbox y EXT_4 ofrecen candidatos, pero esos objetos mezclan cámaras, soportes u otros elementos. No se asigna por proximidad solamente.
- Volante: variantes AL están colapsadas (dimensión máxima ~3.2e-6); variantes ME HR/LR tienen tamaño útil (~0.30) en cockpit. No se confirma identidad Alpine ni conjunto visible sin revisión.

### not_present

**Ninguna categoría completa pudo clasificarse con certeza como not_present.** La ausencia de un nombre semántico no demuestra ausencia de geometría cuando las superficies están combinadas. Sí se verificó que ciertas variantes AL de volante/motor y VENTS_2 están colapsadas y no son targets visibles útiles; eso no descarta otras superficies genéricas. Esta distinción evita fabricar una conclusión de ausencia.

La categoría car es la vista normal/reset del coche, no una pieza aislable. Airbox, Drums, Beam Wing y Cooling Louvres mantienen su alias seguro y no toman prestado un componente vecino.

## Cómo continuar en Blender

1. Abrir el mismo GLB auditado o un .blend que conserve sus nombres de objetos.
2. En Scripting, abrir alpine-select-blender-candidate.py y ejecutar Run Script. Imprime categorías y números de candidatos; sólo cambia la selección/visibilidad del objeto.
3. En la consola de Blender: bpy.app.driver_namespace["select_alpine_candidate"]("nose", 0). Cambiar categoría e índice usando la tabla del script. Alternativamente, descomentar su última línea y ejecutar de nuevo.
4. Numpad . encuadra el candidato. En objetos mixtos: Tab, deseleccionar y L sobre la región que corresponda. Informar categoría, nombre exacto y región/islas que pertenecen; si incluye vecinos, indicarlo. No hace falta identificar de nuevo alerones, ruedas o suspensiones ya confirmados.

El JSON adjunto registra materiales, bounds, centros y nombres exactos de cada candidato. No modifica el GLB.

## Foco seguro y regresiones

Las categorías ambiguas siguen sin foco ni cámara engañosa. Las selecciones sin confirmación vuelven a modo normal, gain 1, tint 0 y haloContrast 0. El detalle FIA permanece independiente del mapping. BGRT conserva shader, parámetros y mapping previos: el contraste nuevo se habilita únicamente en clones Alpine que pertenecen al halo.

## Archivos modificados / nuevos

- src/three/component-isolation.mjs — retirar cian genérico y contraste neutro reversible del halo únicamente.
- src/three/component-isolation.d.mts — diagnóstico haloContrast.
- src/three/component-mesh-map.json — dos reglas de islas, sólo Alpine; hashes y conteos originales.
- docs/alpine-v2-inventory.json — inventario actualizado, sin failures.
- tests/alpine-halo-completeness.test.mjs — halo completo, capas, exclusión de vecinos, conservación de caras y fallo cerrado por fingerprint.
- tests/alpine-focus-robustness.test.mjs — expectativa de color authored restaurado; mantiene pooling/cámaras/reset.
- tests/component-focus-v3.test.mjs — reutilización de caché de particiones en Alpine y BGRT, sin asumir cero particiones Alpine.
- docs/alpine-blender-candidates-2026-10-02.json — candidatos verificables por nombre y bounds.
- scripts/alpine-select-blender-candidate.py — selector manual reversible.
- docs/alpine-lighting-halo-audit-2026-10-02.md — este informe.

No se modificaron Viewer, cámaras, loader authored, GLB, BGRT mapping ni datos FIA. Copias temporales y herramientas QA quedan fuera del repositorio al entregar.

## QA final

- Suite completa: **159 tests aprobados**, 0 fallos, 0 skips.
- Typecheck: npx tsc -b --pretty false aprobado.
- Build de producción normal: npm run build aprobado; aviso previo de chunks >500 kB permanece.
- Lint: npm run lint aprobado.
- git diff --check aprobado.
- QA WebGL del build con diagnóstico: 13 targets del Halo; 12 transiciones entre foco/unsupported; 4 ciclos ghost → Halo → suspensión trasera → Reset; gain 1 / haloContrast 0 al restaurar. FOV 32 y posición de cámara restaurada dentro de tolerancia 1e-9.
- Nariz, piso, difusor, pontones, cubierta, airbox y frenos sin foco mantienen coche normal. La tabla conserva todas las demás categorías ambiguas como pendientes, sin implementar mappings nuevos.
- GP, Alpine → Ferrari/BGRT → Alpine y reload mantienen mapas authored; sin errores de página. BGRT utiliza su asset esperado.
- Regresión existente de livery desktop 1440×1000 y móvil 390×844 aprobada: recuperación ante fallo controlado de ImageBitmap, atlas 4096×1365, 4 cambios GP por viewport, foco/cámaras/idioma/equipo/reset y recarga.
- Comparación final de la región del coche tras Reset contra 4de03fac: **84/469.200 píxeles distintos**, ninguno con diferencia >20/255; máximo 13/255 y media por canal 0.000342/255. El panel se excluyó porque había quedado desplazado por las selecciones.
- Sintaxis del helper Blender validada; su ejecución requiere Blender y los objetos del GLB. No se ejecutó Blender en esta sesión.
- Inventario final: 498 meshes, 13 categorías visualizables, 0 fallos de mapping. Archivos de evidencia incluyen capturas del halo completo, ghost, reset, BGRT, JSON runtime y lista exhaustiva de islas.
- Dependencias originales restauradas después de un traslado accidental al mover la copia temporal; lint y build se completaron después de restaurarlas. Se cerraron servidores propios de QA; fuentes del proyecto y refs Git no se alteraron por ese incidente.

Limitaciones: capturas WebGL en Edge local; móvil emulado, no dispositivo físico. El servidor dev mostró fallos persistentes Outdated Optimize Dep/504, por lo que las comprobaciones visuales completas se ejecutaron sobre build local con un puente de diagnóstico de sólo lectura incluido mediante configuración temporal. El build de producción normal no contiene ese puente. No se atribuye un fallo de caché a la livery ni a la iluminación. La comparación anterior/HEAD sólo acredita la vista y condiciones ensayadas.
