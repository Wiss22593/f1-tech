# Component Focus V2 — 2026-09-30

Trabajo sobre `dev`. Sin commit, push ni deploy.

1. **Luz anterior.** `src/three/ModelViewer.tsx` implementaba `InspectionHighlight`: un `pointLight` en la posición del hotspot, intensidad 1.25, distancia 2.1 y color de acento del equipo. Se montaba junto al suelo y las luces del showroom.

2. **Eliminación.** Se eliminó únicamente ese componente y su llamada. Ambient, hemisphere, directional lights, Environment/Lightformers, exposición, sombras y `CameraFocus` conservan su configuración.

3. **Arquitectura.** `component-mesh-map.json` contiene el mapping auditado por asset; `component-mapping.mjs` valida y resuelve superficies; `component-isolation.mjs` prepara materiales/geometrías privados y administra selección, transición y limpieza. `ModelViewer` conecta selección y ciclo de vida. No se agregó `highlightable` a registros FIA: se infiere de la geometría real validada.

4. **Identificación real.** Ambos GLB fusionan numerosas piezas por material. BGRT tiene `carbon`, `cockpit`, `Livery` y cuatro objetos de ruedas; Alpine tiene los mismos nodos principales, pero `Livery` agrupa tres primitivas (azul, rosa y carbono). Se separan superficies completas de triángulos conectados, uniendo vértices coincidentes para reconocer las costuras del exportador. El mapping identifica nodo/primitiva, huellas de posiciones e índices, primer triángulo y cantidad de triángulos de cada superficie auditada. Se reordenan índices en grupos de render: no se cambian vértices, normales, UV ni triángulos, ni se corta una zona mediante una caja espacial. Una geometría incompatible, una superficie faltante o grupos de materiales no admitidos deshabilitan el componente compuesto completo.

5. **BGRT highlightable.** `floor`, `frontWing`, `rearWing`, `wheels`. Piso: superficie conectada de carbono de 27.628 triángulos. Alerón delantero: superficies de carbono y livery del conjunto de planos/endplates. Alerón trasero: superficies de carbono y livery del conjunto de planos/endplates/soportes. Ruedas: únicamente `FL_Wheel`, `FR_Wheel`, `RL_Wheel`, `RR_Wheel`.

6. **Alpine highlightable.** Los mismos cuatro componentes, con mapping propio. Los alerones combinan las superficies originales de rosa y carbono correspondientes; el azul del resto del coche se conserva. No se reutilizan selectores de primitivas de BGRT para Alpine.

7. **Sin aislamiento actual.** `sidepods`, `nose`, `engineCover`, `halo`, `chassis`, `cooling`, `frontSuspension`, `rearSuspension`, `frontBrake`, `rearBrake`, `steeringWheel`, `diffuser` y `car`. Pontones/nariz/cubierta/halo forman parte de superficies pintadas conectadas: resaltarlas completas incluiría otras piezas. Suspensiones y cockpit no tienen un conjunto completo validado para este mapping. Los componentes internos y detalles sin geometría identificada tampoco se resaltan. El difusor está conectado al piso: seleccionar piso conserva el conjunto real piso/difusor, pero seleccionar difusor no simula una separación inexistente.

8. **Sin pieza.** Se mantiene la información técnica y el comportamiento existente de cámara; el coche vuelve a apariencia normal. Un hotspot por sí solo no habilita el aislamiento. Seleccionar una actualización sin `componentId`, como Espejos de Red Bull, limpia el aislamiento previo sin modificar la cámara. No se inventan meshes, luces ni halos.

9. **Materiales y restauración.** Cada grupo usa un material privado; texturas y fuentes GLTF cacheadas permanecen compartidas en lectura. El shader conserva el pase de livery y multiplica el color final visible por 1 para la pieza y 0.28 para el contexto. Color, emissive, roughness, metalness, opacidad y texturas originales no se alteran para el focus. No hay transparencia ni emissive adicional. El carbono conserva su apariencia original, por lo que las caras de carbono originalmente oscuras siguen oscuras. Una transición smoothstep de 280 ms interpola el multiplicador. Desseleccionar devuelve exactamente 1. `dispose()` restaura referencias originales de materiales/geometría y flags de sombras, libera clones privados y es idempotente; no libera texturas ni geometrías fuente. `dispose={null}` evita que R3F elimine los recursos compartidos del GLTF.

10. **Cambios de estado.** Componente A → B interpola desde el estado actual y devuelve A al contraste de contexto. Cerrar/restablecer vuelve a 1. Cambiar equipo/GP limpia la selección existente; cambiar modelo o tema elimina el controlador previo y prepara otro sin estado oscuro residual. Desmontar `OriginalModel` ejecuta la misma limpieza. La cámara y sus presets/hotspots conservan su implementación.

11. **Rendimiento.** Resolución de topología y preparación ocurren al cargar modelo/cambiar tema, no al seleccionar ni por frame. BGRT prepara 12 canales de material y 2 geometrías privadas; Alpine, 15 canales y 3 geometrías. La división agrega grupos/draw calls para representar piezas fusionadas. `useFrame` sólo interpola uniforms cacheados durante 280 ms; terminado el intervalo no recorre canales. No se hace `scene.traverse()` ni se clonan materiales por frame. Tests de 100 cambios mantienen UUIDs y cantidad de geometrías. El QA de navegador también mantiene las asignaciones de renderer entre selecciones y al volver a McLaren. No se midieron FPS en dispositivos físicos.

12. **QA desktop.** Build de producción local, Edge/WebGL con SwiftShader, 1440×1000. McLaren/Azerbaiyán: Piso, Pontones, Alerón trasero y Alerón delantero; superficies reales aisladas, pontones sin falso resaltado, ruedas oscurecidas al seleccionar alerones/piso. Secuencia A → B → cerrar → Restablecer → Williams → McLaren y 12 selecciones repetidas: restauración y asignaciones estables. Red Bull/Espejos después de Piso: sin highlight y misma posición/target de cámara. Alpine/Italia: alerón delantero y trasero; Madrid: piso; cambios GP/equipo/asset limpian el estado. Azul/rosa, colores, propiedades y texturas de materiales se conservan. Sin page errors ni warnings de Three.js/WebGL; sin PointLight/SpotLight; materiales sólidos y sombras activas. Capturas revisadas sin nuevos artefactos visibles. Se conserva el encuadre original, incluso la vista inferior del piso.

13. **QA mobile.** Viewport 390×844 en el mismo navegador de escritorio; no prueba en un teléfono físico. McLaren: Entrada del pontón sin resaltado, Alerón trasero y Borde del piso con aislamiento, cerrar restaura. Alpine/Italia: Alerón trasero y cerrar; azul/rosa conservados. Capturas revisadas. Layout y controles móviles sin cambios.

14. **Tests.** `npm test`: 73 aprobados, 0 fallos, 0 omitidos en este entorno; 12 nuevos tests de aislamiento. Cubren mapping por modelo, desconocidos/superficies faltantes, topología modificada/materiales incompatibles, conservación de vértices/normales/UV/triángulos, hashes SHA-256 de GLB, materiales compartidos, transición, cambios repetidos, cambio de asset, disposición y composición del shader. Los tests que requieren GLB locales se omiten explícitamente si dichos archivos de evaluación no están disponibles en otro entorno.

15. **Lint.** `npm run lint`: aprobado.

16. **Build.** `npm run build`: aprobado. Vite mantiene el aviso de chunk grande del Garage; no se agregó ninguna dependencia.

17. **Diff-check.** `git diff --check`: aprobado; también se comprobaron whitespace y marcadores de conflicto en archivos nuevos.

18. **Archivos.** Modificados: `src/three/ModelViewer.tsx`, `src/features/garage/GaragePage.tsx`. Nuevos: `src/three/component-mesh-map.json`, `src/three/component-mapping.mjs`, `src/three/component-isolation.mjs`, `src/three/component-isolation.d.mts`, `tests/component-isolation.test.mjs`, este informe. Helpers y capturas locales quedan en `ingestion/output/`, directorio ignorado por Git. Para ampliar el mapping futuro, agregar objetos de pieza reales a `objects`, o superficies completas auditadas a `meshRules`; actualizar sus huellas y tests después de validar la nueva versión del asset.

19. **Fuera de alcance intacto.** Sin cambios a FIA/datasets, traducciones, automatización, registry de GP, asset registry, branding, colores de equipos, estilos/layout, Netlify ni archivos GLB. Los tests validan los SHA-256 de ambos GLB originales. No se usó Blender.

20. **Entrega local.** Sin commit, push ni deploy. Cambios disponibles en el working tree de `dev`.

Evidencia reproducible de QA local: `ingestion/output/qa-component-focus-v2.mjs`; resultado `ingestion/output/component-focus-v2-browser-qa.json`; capturas `ingestion/output/focus-v2-*.png`.
