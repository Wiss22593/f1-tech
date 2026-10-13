# Component Focus V3 — 2026-10-01

Implementado en `dev`, sobre `7c0aa7d7ceeb200a4a5e2db73b7479624f896ae4`. La cobertura pasa de 4 componentes a 18 conjuntos físicos, más dos subconjuntos de ruedas usados para componer los corners. Sin commit, push ni deploy.

## 1. Causa exacta

V2 sólo tenía mappings para `frontWing`, `rearWing`, `floor` y `wheels`. Los otros hotspots movían la cámara, pero no resolvían geometría seleccionada. No había un problema general de nombres de mesh ni de materiales compartidos: el mapping era insuficiente y la auditoría soldaba por posición vértices que el exportador había mantenido separados.

La soldadura unía superficies que se tocan, aunque usaran índices distintos. En BGRT, `Livery` pasaba de 301 islas indexadas a 38 superficies soldadas; una superficie de 71.316 triángulos agrupaba carrocería y halo. En `carbon`, una superficie soldada de 27.628 triángulos agrupaba piso y difusor. Usar sólo esa partición ocultaba boundaries originales aprovechables.

Además, algunas filas reales, como Rear Corner y Mirrors, tenían `componentId: null`. El visor no recibía su nombre FIA para resolver la geometría independientemente de los metadatos de publicación. El puente ahora pasa el nombre original sin cambiar ningún registro.

El piso ya resolvía targets en V2, pero su cara inferior quedaba casi negra con el entorno superior. La cámara del difusor también era limitada por `maxPolarAngle`, aunque su preset pedía una vista inferior. V3 agrega un panel suave al entorno de estudio, permite esa vista y mejora el encuadre de piso/suspensiones. Conserva PBR, texturas y multiplicadores 1 / 0,28; no añade PointLight, SpotLight, glow ni emissive de selección.

No se reprodujo en V2 el bug de oscurecer todo con cero targets: ya existía una protección. V3 conserva y refuerza esa condición con targets y canales reales.

## 2. Jerarquía real BGRT

El inventario se obtuvo mediante `GLTFLoader.parseAsync`, con matrices mundiales y geometría original. En la auditoría CPU se omite únicamente decodificar imágenes; el QA del navegador carga texturas reales.

```text
Scene (Group)
└─ F1_Concept_2026 (Object3D)
   ├─ carbon (Mesh, carbon_mat)
   ├─ cockpit (Mesh, cockpit_mat)
   ├─ Livery (Mesh, livery)
   └─ Wheels (Object3D)
      ├─ FL_Wheel (Mesh, Wheels)
      ├─ FR_Wheel (Mesh, Wheels)
      ├─ RL_Wheel (Mesh, Wheels)
      └─ RR_Wheel (Mesh, Wheels)
```

| Mesh | Vértices | Triángulos | Islas indexadas | Islas soldadas 1e6 |
|---|---:|---:|---:|---:|
| carbon | 74.112 | 134.470 | 154 | 68 |
| cockpit | 9.447 | 17.828 | 3 | 3 |
| Livery | 70.870 | 119.982 | 301 | 38 |
| Cada una de las cuatro ruedas | 114.510 | 206.210 | 213 | 179 |

[Inventario BGRT con ancestry, children, matrices, materials, grupos, bounds e islas](C:/Users/mb937/Desktop/f1-tech/ingestion/output/focus-v3-inventory-bgrt-f1-concept-2026.glb.json).

## 3. Jerarquía real Alpine

```text
Scene (Group)
└─ F1_Concept_2026 (Object3D)
   ├─ carbon (Mesh, carbon_mat)
   ├─ cockpit (Mesh, cockpit_mat)
   ├─ Livery (Group)
   │  ├─ Mesh (Mesh, livery azul)
   │  ├─ Mesh_1 (Mesh, Alpine Pink)
   │  └─ Mesh_2 (Mesh, carbon_mat)
   └─ Wheels (Object3D)
      ├─ FL_Wheel (Mesh, Wheels)
      ├─ FR_Wheel (Mesh, Wheels)
      ├─ RL_Wheel (Mesh, Wheels)
      └─ RR_Wheel (Mesh, Wheels)
```

Carbon, cockpit y ruedas tienen los mismos conteos de geometría que BGRT. La carrocería presenta tres primitivas diferentes:

| Primitiva | Vértices | Triángulos | Islas indexadas | Islas soldadas 1e6 |
|---|---:|---:|---:|---:|
| Azul / Mesh | 46.380 | 78.964 | 175 | 23 |
| Rosa / Mesh_1 | 17.468 | 29.467 | 90 | 28 |
| Carbono / Mesh_2 | 7.640 | 11.669 | 103 | 16 |

[Inventario Alpine completo](C:/Users/mb937/Desktop/f1-tech/ingestion/output/focus-v3-inventory-alpine-a526-formulatech.glb.json).

## 4. Geometry groups encontrados

Todas las BufferGeometry originales de ambos GLB tienen `groups.length === 0`. Los materiales de Alpine se separan mediante primitivas GLTF y meshes hijos de `Livery`, no mediante grupos dentro de una geometría.

El controlador soporta también geometry/material groups reales, probado con fixtures. Exige rangos completos, no superpuestos, alineados a triángulos y con material válido. Los grupos runtime que crea para las islas son una partición de render; no se atribuyen al GLB original.

## 5. Geometry islands útiles

La conectividad por índices conserva los boundaries originales sin soldar posiciones coincidentes. Se verificaron visualmente superficies completas de nariz, halo, pontones, cubierta, wishbones, rampas de difusor, conjuntos de freno, espejos y cámara onboard. Una pieza puede reunir muchas islas, incluidas costuras de exportación.

Ejemplos BGRT: nariz 6 islas / 2.452 triángulos; halo 1 / 5.376; pontones 8 / 22.296; cubierta 8 / 14.332; difusor 2 / 11.648; espejos 30 / 11.952. Las islas de difusor `firstTriangle: 3` y `30348` son boundaries existentes dentro de carbon. El piso conserva sus 27.628 triángulos y contiene también esas rampas, sin dibujarlas dos veces.

Bounds sirven para auditar anatomía; no se usan umbrales x/z ni cajas espaciales para pintar zonas. La cámara onboard se verificó como la pieza en T sobre la toma de aire; se descartó expresamente identificarla como volante.

Auditoría reproducible: `node scripts/component-focus-audit.mjs`. Produce los inventarios locales anteriores sin escribir en los GLB.

## 6. Estrategia de matching

Se resuelve un nodo único por nombre normalizado, se recorren sus meshes anidados y se aplica el mapping del asset. Una regla identifica primitiva, cantidades y huellas de posiciones/índices; sus selectores señalan islas completas por primer triángulo y cantidad de triángulos. No se activa un componente incompleto ni una geometría incompatible.

Hay soporte para mesh individual, Object3D/Group con varios meshes, geometry groups e islas conectadas. Los corners componen suspensión, conjunto de freno y dos ruedas. Se deduplican targets y se agrupan superficies por material y pertenencias semánticas; cada cara original se dibuja una vez.

Los aliases están centralizados. `front-wing`, `front_wing`, `Front Wing` y `frontWing` resuelven lo mismo. Floor Body/Edge/Fences corresponden al conjunto floor. Corner conserva su identidad propia; Drum nunca se convierte en Suspension. Airbox, Beam Wing y Cooling Louvres no reciben el highlight de una pieza distinta por fallback.

## 7. Mapping BGRT

Carbon contiene piso, parte de ambos alerones, suspensiones, conjuntos de freno, difusor y cámara onboard. Livery contiene el resto de los alerones, nariz, halo, pontones, cubierta y espejos. Cockpit y ruedas se resuelven como meshes completos. Front/Rear Corner son conjuntos explícitos, no aliases de suspensión.

El mapping conserva los selectores originales de alas/piso mediante su expansión a islas indexadas completas. Los hashes de geometría impiden que cambios futuros del asset activen un mapping obsoleto.

## 8. Mapping Alpine

Alpine tiene reglas separadas para carbon y las tres primitivas de Livery. Nariz, halo y pontones reúnen targets de materiales diferentes. No se usan IDs de isla BGRT para la carrocería Alpine.

Durante la auditoría se compararon caras originales entre assets para localizar correspondencias y después se seleccionaron islas Alpine completas, incluidas las divisiones propias por material. El runtime sólo usa sus selectores auditados y fingerprints, sin matching espacial ni transferencia dinámica de geometría.

## 9. Tabla completa de cobertura

YES indica targets completos y aislamiento soportado. El número entre paréntesis es la cantidad de targets. Los dos subconjuntos de ruedas son auxiliares y no se cuentan como nuevas piezas físicas.

| Componente | BGRT | Alpine | Método |
|---|---|---|---|
| Front Wing | YES (92) | YES (92) | Islas de varios materiales |
| Rear Wing | YES (39) | YES (39) | Islas de varios materiales |
| Floor | YES (7) | YES (7) | Islas completas de carbon |
| Sidepods | YES (8) | YES (10) | Islas de carrocería |
| Nose | YES (6) | YES (21) | Islas de carrocería; varias primitivas Alpine |
| Halo | YES (1) | YES (7) | Boundary indexado; varias primitivas Alpine |
| Engine Cover | YES (8) | YES (8) | Islas completas de carrocería |
| Front Suspension | YES (32) | YES (32) | Brazos/elementos completos de carbon |
| Rear Suspension | YES (16) | YES (16) | Brazos/elementos completos de carbon |
| Diffuser | YES (2) | YES (2) | Rampas completas de carbon |
| Wheels | YES (4) | YES (4) | Cuatro meshes originales |
| Front Corner | YES (66) | YES (66) | Suspensión + frenos + dos meshes de ruedas |
| Rear Corner | YES (42) | YES (42) | Suspensión + frenos + dos meshes de ruedas |
| Cockpit / chassis del visor | YES (1) | YES (1) | Mesh cockpit completo; no todo el chasis |
| Front Brake assembly | YES (32) | YES (32) | Conjunto de geometría de freno/conductos |
| Rear Brake assembly | YES (24) | YES (24) | Conjunto de geometría de freno/conductos |
| Mirrors | YES (30) | YES (30) | Dos espejos y sus soportes completos |
| Onboard / TV Camera | YES (12) | YES (12) | Cámara en T de carbon |
| Front Wheels, auxiliar | YES (2) | YES (2) | Dos meshes |
| Rear Wheels, auxiliar | YES (2) | YES (2) | Dos meshes |
| Cooling Louvres / cooling | NO | NO | Sin conjunto de branquias/radiadores inequívoco |
| Airbox como pieza individual | NO | NO | Abertura de la cubierta sin conjunto independiente auditado |
| Beam Wing | NO | NO | No hay un conjunto inferior independiente identificado |
| Front Drum individual | NO | NO | No hay separación auditada del drum respecto del conjunto de freno |
| Rear Drum individual | NO | NO | No hay separación auditada del drum respecto del conjunto de freno |
| Steering Wheel | NO | NO | No se identificó volante independiente en el interior |
| Car completo | NO | NO | Reset/estado normal, no selección de una pieza |

## 10. Piezas que ahora funcionan

Nariz, halo, pontones, cubierta del motor, suspensiones delantera/trasera, difusor, cockpit, conjuntos de freno, espejos, cámara onboard y ambos corners. Piso conserva su conjunto real y ahora es legible desde abajo. Ambos alerones y ruedas mantienen su cobertura.

Las piezas sin una fila publicada pueden comprobarse mediante las selecciones de piezas existentes en desktop o el controlador, sin crear publicaciones ficticias. La cámara onboard está disponible en el mapping y resolver, pero no se añadió un control ni una actualización FIA para mostrarla.

## 11. Piezas que siguen sin aislamiento

Cooling/branquias/radiadores, Airbox individual, Beam Wing, Front/Rear Drum individual y Steering Wheel. El coche completo permanece como estado normal. Esto no invalida los targets de sus conjuntos mayores, por ejemplo Engine Cover o Front Brake assembly.

## 12. Motivo técnico de cada NO

- **Cooling:** ni nodos, ni grupos originales, ni islas revisadas ofrecen un conjunto inequívoco de branquias/radiadores. Resaltar pontones o cubierta completa atribuiría otro componente al registro.
- **Airbox:** la abertura visible pertenece a superficies de la cubierta. No se validó una envolvente independiente y completa para esa abertura; no se corta una franja por coordenadas.
- **Beam Wing:** se auditó el conjunto trasero; no se identificó un conjunto inferior completo distinto de ala principal, soportes y difusor. No se reutiliza Rear Wing para simularlo.
- **Front/Rear Drum:** la geometría permite el conjunto de freno/carenados/conductos. No se validó una separación completa específica de drum; esa etiqueta no se asimila a suspensión, rueda o freno completo.
- **Steering Wheel:** la revisión del cockpit y de las islas de carbon no identificó un volante independiente. La isla grande sobre la toma de aire es una cámara en T y tiene su mapping correcto, no un alias de volante.
- **Car:** es el estado sin selección, por lo que no se oscurece un supuesto resto del coche.

Estas decisiones limitan el mapping a anatomía demostrable; no afirman que una mejora futura del GLB sea imposible.

## 13. Target count = 0 y restauración

La selección sólo activa isolation cuando resuelve targets completos y existe al menos un canal de material que pertenezca al componente. Cero targets, asset desconocido, geometría incompatible, componente desconocido o composite incompleto devuelven todos los gains a 1. La cámara usa un hotspot existente cuando corresponde.

Cerrar/restablecer, pasar de una pieza a otra, cambiar equipo, GP o asset y desmontar restauran los materiales/geometrías originales o el estado normal. Seleccionar/cerrar una fila con componentId nulo limpia también la selección anterior: no reaparece una pieza vieja al cerrar. Dispose restaura referencias/flags de sombras, libera materiales y geometrías privados una vez y conserva texturas fuente.

## 14. QA Audi completo

Azerbaiyán, desktop 1440×900: las diez prioridades solicitadas pasaron, incluidos difusor y Rear Corner. También se probaron pontones, ruedas, cockpit y ambos conjuntos de freno; Beam Wing produce cero targets y coche normal. Las 14 filas publicadas se probaron individualmente en 390×844, incluidas placas laterales y aliases de piso.

Hay una comprobación adicional de Halo a 1366×768. Se verificaron targets, uniforms realmente compilados por WebGL, opacidad sólida, propiedades/UUIDs de materiales y asignaciones de geometrías/texturas. Se revisaron capturas de la anatomía seleccionada, piso y difusor legibles y ambas suspensiones.

## 15. QA McLaren

Azerbaiyán: ocho selecciones desktop, incluyendo áreas sin una actualización propia, y las ocho filas publicadas en móvil. Entrada del pontón, cubierta, piso y difusor resuelven targets. Branquias de refrigeración conserva el coche normal. Cerrar/restablecer devuelve gain 1, sin cambiar PBR ni asignaciones.

## 16. QA Red Bull y Front Corner

Red Bull/Azerbaiyán: nueve selecciones desktop y las cinco filas publicadas en móvil. Espejos ahora resuelve 30 islas aunque la fila tenga componentId nulo; cooling conserva cero targets. Se revisó la captura móvil de los espejos.

Williams/Azerbaiyán agrega comprobación física de Front Corner en desktop y móvil: 66 targets, islas y dos meshes de ruedas, con sus brazos y conjunto de freno. Rear Corner se verifica con Audi. Los aliases de Corner no activan sólo la suspensión.

## 17. QA Alpine

Italia/Alpine, con su GLB propio: 14 selecciones desktop (alas, nariz, piso, difusor, pontones, halo, cubierta, suspensiones, cockpit, ruedas y ambos conjuntos de freno). Se comprobó independientemente el mapping de sus tres primitivas de livery.

Azul/rosa, texturas, color, emissive, roughness, metalness y opacidad permanecen intactos entre selecciones. Se revisaron capturas de nariz, halo, pontones, piso y difusor. Alpine → Audi, cambio de GP y cierre/reset restauran gain 1. Alerón trasero y cierre también se comprobaron en 390×844, sin overflow horizontal.

QA sobre build de producción local, Edge/WebGL con SwiftShader. Los viewports móviles son emulación de tamaño en navegador de escritorio; no constituyen medición en un teléfono físico. Consola principal: cero page errors y cero warnings WebGL/Three/shaders. Sin PointLight/SpotLight.

## 18. Rendimiento

Conectividad y fingerprints se calculan al preparar el asset/tema. WeakMap por geometría original, fingerprint, asset y modo conserva las particiones entre clones de equipo; un asset diferente o una geometría mutada no usa la partición anterior. Seleccionar sólo modifica destinos de uniforms; cada frame interpola durante 280 ms y deja de recorrer canales al terminar.

| Medición CPU local Node | BGRT | Alpine |
|---|---:|---:|
| Preparación fría | 195,9 ms | 153,2 ms |
| Preparación con particiones cacheadas | 117,4 ms | 104,4 ms |
| Particiones frías / cacheadas | 2 / 2 hits | 4 / 4 hits |
| 100 selecciones + transición completa | 1,1 ms | 0,3 ms |
| Canales de material | 23 | 31 |
| Geometrías privadas | 2 | 4 |
| Draw calls observadas del visor | Hasta 24 | Hasta 32 |

Se agrupan islas de igual pertenencia/material, no se crea un mesh/material por isla. No se agrega ninguna cara; índices reordenados mantienen winding, UV y normales. El mayor número de componentes requiere más grupos que V2. Los tests de 100 cambios mantienen UUIDs/geometrías y dispose no deja recursos privados pendientes.

En navegador: BGRT mantuvo 22 geometrías/12 texturas del renderer al pasar Audi → McLaren → Red Bull y durante selecciones. McLaren/Red Bull reutilizan las dos particiones. Alpine mantuvo su baseline de 29 geometrías/19 texturas durante selecciones. Estas cifras incluyen el entorno y son mediciones locales, no una garantía de FPS de hardware móvil.

[Mediciones CPU](C:/Users/mb937/Desktop/f1-tech/ingestion/output/component-focus-v3-performance.json).

## 19. Tests

`npm test`: **116/116**, cero fallos y cero omitidos. Once casos nuevos V3 cubren mesh anidado/directo, múltiples meshes, nombres ambiguos, material groups, rechazo de grupos superpuestos, boundaries indexados/coincidentes, geometría no indexada, aliases, positivos/cero targets, cache por asset/mutación, composites superpuestos/incompletos y ambos GLB mediante el loader real.

Los tests existentes de isolation verifican SHA-256 de los GLB, posiciones/normales/UV y cada triángulo original, hooks de material/livery, transiciones, 100 cambios, restauración exacta, dispose idempotente y limpieza entre assets. Se actualizó la aserción existente del puente Garage para comprobar que una fila sin componentId limpia el estado y pasa su nombre original al visor.

## 20. Lint

`npm run lint`: aprobado, exit code 0.

## 21. Build

`npm run build`: aprobado, exit code 0. TypeScript y Vite compilaron 641 módulos. Se conserva la advertencia de chunk mayor de 500 kB; Garage resultante: 1.101,35 kB / 302,39 kB gzip. No se cambió el bundler ni la arquitectura de rutas para silenciarla.

## 22. Diff-check

`git diff --check`: aprobado. Git informa únicamente la conversión LF → CRLF configurada para el checkout Windows; no hay errores de whitespace.

## 23. Archivos modificados

- [component-mesh-map.json](C:/Users/mb937/Desktop/f1-tech/src/three/component-mesh-map.json): mappings separados y selectores de islas/composites.
- [component-mapping.mjs](C:/Users/mb937/Desktop/f1-tech/src/three/component-mapping.mjs) y [declaraciones nuevas](C:/Users/mb937/Desktop/f1-tech/src/three/component-mapping.d.mts): conectividad, cache, resolver y aliases.
- [component-isolation.mjs](C:/Users/mb937/Desktop/f1-tech/src/three/component-isolation.mjs) y [declaraciones](C:/Users/mb937/Desktop/f1-tech/src/three/component-isolation.d.mts): targets, grupos, materiales privados, transición, diagnóstico y restauración.
- [ModelViewer.tsx](C:/Users/mb937/Desktop/f1-tech/src/three/ModelViewer.tsx): puente al resolver, diagnóstico DEV/helper interno, cámaras y panel inferior de entorno.
- [assets.ts](C:/Users/mb937/Desktop/f1-tech/src/three/assets.ts): sólo ampliación del tipo CarComponentId; registro y paths de assets intactos.
- [GaragePage.tsx](C:/Users/mb937/Desktop/f1-tech/src/features/garage/GaragePage.tsx): sólo prop de nombre original al visor y limpieza del estado 3D al seleccionar/cerrar una fila sin componentId.
- [component-focus-audit.mjs, nuevo](C:/Users/mb937/Desktop/f1-tech/scripts/component-focus-audit.mjs): inventario reproducible con loader real.
- [component-focus-v3.test.mjs, nuevo](C:/Users/mb937/Desktop/f1-tech/tests/component-focus-v3.test.mjs), [component-isolation.test.mjs](C:/Users/mb937/Desktop/f1-tech/tests/component-isolation.test.mjs) y [fia-ingestion.test.mjs](C:/Users/mb937/Desktop/f1-tech/tests/fia-ingestion.test.mjs): validación y adaptación del puente 3D.
- Este informe.

Inventarios, capturas y herramientas locales de QA quedan en `ingestion/output`, ya ignorado por Git; no se agregó geometría exportada ni dependencias.

## 24. GLB intactos

SHA-256 antes/después, iguales a los del mapping V2:

```text
BGRT   bdef86a049372691492063d45643455e44035eb7280068932510cf797c69f23a
Alpine 6d1f8f5680ab4c627fb8e4b82fc089c5fe047ccb0c45961c3673d394c9a9fd03
```

No se editó Blender ni se guardaron submeshes. Las particiones de render existen exclusivamente en memoria del visor.

## 25. FIA/UI intactos

Sin cambios en registros/datasets FIA, ingestión, traducciones, calendario, FP1, selectores año/GP, cards, contadores, branding, CSS, Netlify ni workflows. La suite confirma datasets históricos intactos y los 38 registros de Azerbaiyán.

Garage tiene el puente 3D descrito en el punto 23; no se modificaron sus controles, textos, publicaciones ni flags visualizable. Las vistas/cámaras y la iluminación inferior del entorno son cambios del visor 3D.

## 26. Sin commit

No se ejecutó commit. HEAD permanece en `7c0aa7d7ceeb200a4a5e2db73b7479624f896ae4`, rama `dev`; el trabajo queda sin commitear.

## 27. Sin push

No se ejecutó push ni se modificaron refs remotas.

## 28. Sin deploy y evidencia de cada selección

No se ejecutó deploy. Los servidores usados fueron previews locales de QA y se cerraron al terminar.

[QA principal](C:/Users/mb937/Desktop/f1-tech/ingestion/output/component-focus-v3-browser-qa.json) y [QA adicional](C:/Users/mb937/Desktop/f1-tech/ingestion/output/component-focus-v3-extra-qa.json) registran componente resuelto, cantidad de targets, tipo y estado de aislamiento. Son **78 selecciones registradas**; cierre/reset se comprobaron además después de cada una. Los tests del loader verifican los 18 conjuntos físicos en ambos assets, incluidos los que no tienen un control FIA publicado.

Las siguientes tablas conservan cada selección de los reportes. El resaltado combina verificación de uniforms WebGL (pieza 1, resto 0,28) y revisión de capturas/anatomía; NO significa coche normal por falta de target.

### Selecciones principales

| Equipo | Viewport | Selección | componentId | Targets | Tipo | Highlight |
|---|---|---|---|---:|---|---|
| Audi | 1440x900 | Alerón delantero | frontWing | 92 | island | YES |
| Audi | 1440x900 | Nariz | nose | 6 | island | YES |
| Audi | 1440x900 | Suspensión delantera | frontSuspension | 32 | island | YES |
| Audi | 1440x900 | Piso | floor | 7 | island | YES |
| Audi | 1440x900 | Halo | halo | 1 | island | YES |
| Audi | 1440x900 | Cubierta del motor | engineCover | 8 | island | YES |
| Audi | 1440x900 | Suspensión trasera | rearSuspension | 16 | island | YES |
| Audi | 1440x900 | Alerón trasero | rearWing | 39 | island | YES |
| Audi | 1440x900 | Difusor | diffuser | 2 | island | YES |
| Audi | 1440x900 | Pontones | sidepods | 8 | island | YES |
| Audi | 1440x900 | Ruedas y neumáticos | wheels | 4 | mesh | YES |
| Audi | 1440x900 | Cockpit | chassis | 1 | mesh | YES |
| Audi | 1440x900 | Frenos delanteros | frontBrake | 32 | island | YES |
| Audi | 1440x900 | Frenos traseros | rearBrake | 24 | island | YES |
| Audi | 1440x900 | Conjunto trasero | rearCorner | 42 | island + mesh | YES |
| Audi | 1440x900 | Alerón viga | — | 0 | — | NO |
| McLaren | 1440x900 | Piso | floor | 7 | island | YES |
| McLaren | 1440x900 | Halo | halo | 1 | island | YES |
| McLaren | 1440x900 | Cubierta del motor | engineCover | 8 | island | YES |
| McLaren | 1440x900 | Suspensión trasera | rearSuspension | 16 | island | YES |
| McLaren | 1440x900 | Alerón trasero | rearWing | 39 | island | YES |
| McLaren | 1440x900 | Difusor | diffuser | 2 | island | YES |
| McLaren | 1440x900 | Pontones | sidepods | 8 | island | YES |
| McLaren | 1440x900 | Refrigeración | — | 0 | — | NO |
| Red Bull Racing | 1440x900 | Piso | floor | 7 | island | YES |
| Red Bull Racing | 1440x900 | Halo | halo | 1 | island | YES |
| Red Bull Racing | 1440x900 | Cubierta del motor | engineCover | 8 | island | YES |
| Red Bull Racing | 1440x900 | Suspensión trasera | rearSuspension | 16 | island | YES |
| Red Bull Racing | 1440x900 | Alerón trasero | rearWing | 39 | island | YES |
| Red Bull Racing | 1440x900 | Difusor | diffuser | 2 | island | YES |
| Red Bull Racing | 1440x900 | Pontones | sidepods | 8 | island | YES |
| Red Bull Racing | 1440x900 | Refrigeración | — | 0 | — | NO |
| Red Bull Racing | 1440x900 | Espejos | mirrors | 30 | island | YES |
| Alpine | 1440x900 | Alerón delantero | frontWing | 92 | island | YES |
| Alpine | 1440x900 | Nariz | nose | 21 | island | YES |
| Alpine | 1440x900 | Suspensión delantera | frontSuspension | 32 | island | YES |
| Alpine | 1440x900 | Piso | floor | 7 | island | YES |
| Alpine | 1440x900 | Halo | halo | 7 | island | YES |
| Alpine | 1440x900 | Cubierta del motor | engineCover | 8 | island | YES |
| Alpine | 1440x900 | Suspensión trasera | rearSuspension | 16 | island | YES |
| Alpine | 1440x900 | Alerón trasero | rearWing | 39 | island | YES |
| Alpine | 1440x900 | Difusor | diffuser | 2 | island | YES |
| Alpine | 1440x900 | Pontones | sidepods | 10 | island | YES |
| Alpine | 1440x900 | Ruedas y neumáticos | wheels | 4 | mesh | YES |
| Alpine | 1440x900 | Cockpit | chassis | 1 | mesh | YES |
| Alpine | 1440x900 | Frenos delanteros | frontBrake | 32 | island | YES |
| Alpine | 1440x900 | Frenos traseros | rearBrake | 24 | island | YES |
| Audi | 1366x768 | Halo | halo | 1 | island | YES |
| AUD | 390x844 | Alerón delantero | frontWing | 92 | island | YES |
| AUD | 390x844 | Placa lateral del alerón delantero | frontWing | 92 | island | YES |
| AUD | 390x844 | Nariz | nose | 6 | island | YES |
| AUD | 390x844 | Suspensión delantera | frontSuspension | 32 | island | YES |
| AUD | 390x844 | Cuerpo del piso | floor | 7 | island | YES |
| AUD | 390x844 | Elementos del borde de ataque del piso | floor | 7 | island | YES |
| AUD | 390x844 | Difusor | diffuser | 2 | island | YES |
| AUD | 390x844 | Halo | halo | 1 | island | YES |
| AUD | 390x844 | Zona de estrechamiento trasero / Cubierta del motor | engineCover | 8 | island | YES |
| AUD | 390x844 | Suspensión trasera | rearSuspension | 16 | island | YES |
| AUD | 390x844 | Conjunto trasero | rearCorner | 42 | island + mesh | YES |
| AUD | 390x844 | Alerón viga | — | 0 | — | NO |
| AUD | 390x844 | Alerón trasero | rearWing | 39 | island | YES |
| AUD | 390x844 | Placa lateral del alerón trasero | rearWing | 39 | island | YES |
| MCL | 390x844 | Entrada del pontón | sidepods | 8 | island | YES |
| MCL | 390x844 | Zona de estrechamiento trasero / Cubierta del motor | engineCover | 8 | island | YES |
| MCL | 390x844 | Zona de estrechamiento trasero / Cubierta del motor | engineCover | 8 | island | YES |
| MCL | 390x844 | Branquias de refrigeración | — | 0 | — | NO |
| MCL | 390x844 | Borde del piso | floor | 7 | island | YES |
| MCL | 390x844 | Difusor | diffuser | 2 | island | YES |
| MCL | 390x844 | Suspensión trasera | rearSuspension | 16 | island | YES |
| MCL | 390x844 | Alerón trasero | rearWing | 39 | island | YES |

### Selecciones adicionales

| Equipo | Viewport | Selección | componentId | Targets | Tipo | Highlight |
|---|---|---|---|---:|---|---|
| Williams | 1440x900 | Conjunto delantero | frontCorner | 66 | island + mesh | YES |
| Williams | 390x844 | Conjunto delantero | frontCorner | 66 | island + mesh | YES |
| Red Bull Racing | 390x844 | Cuerpo del piso y difusor | floor | 7 | island | YES |
| Red Bull Racing | 390x844 | Pontón | sidepods | 8 | island | YES |
| Red Bull Racing | 390x844 | Branquias de refrigeración | — | 0 | — | NO |
| Red Bull Racing | 390x844 | Espejos | mirrors | 30 | island | YES |
| Red Bull Racing | 390x844 | Halo | halo | 1 | island | YES |
| Alpine | 390x844 | Alerón trasero | rearWing | 39 | island | YES |
