# Cierre Focus V2, contadores, calendario FP1 y temporadas — 2026-09-30

1. **dev/main.** Precheck y cierre sobre `dev`. `dev`, `main`, `origin/dev` y `origin/main` locales apuntan a `01289b4` (Correccion actualizaciones en ESPAÑOL). `git rev-list --left-right --count dev...main`: `0 0`. No merge pendiente, índice sin conflictos ni cambios staged. Las referencias remotas aquí son las registradas localmente; no se hizo fetch ni cambio de branch.

2. **Stash.** `stash@{0}`: `684755d6984f26066f16f643c1ae561d402b72e5`, mensaje `On dev: !!GitHub_Desktop<dev>`, parent `01289b4`. Contiene siete archivos de una versión anterior de Focus V2: GaragePage, ModelViewer, declaración/controlador de aislamiento, mapping, JSON y tests. Garage y JSON/declaración coinciden; ModelViewer difiere sólo en formato; mapping/controlador/tests fueron recuperados con lógica equivalente y protecciones/tests adicionales en el working tree. No se encontraron cambios funcionales únicos faltantes. El nombre y parent son compatibles con el autostash de Desktop durante la actualización mencionada; el objeto no demuestra por sí solo toda la secuencia de operaciones. **Stash redundante pendiente de limpieza, conservado sin aplicar ni eliminar.**

3. **Focus V2 íntegro.** Antes de editar se auditó cada archivo del stash contra el working tree, se revisaron diffs y pasaron los 12 tests de aislamiento. Una sola integración/controlador. Sin pointLight de selección, ganancias 0.28/1 y transición 280 ms, sin highlight falso, livery preservada y restauración de selección/equipo/GP.

4. **Archivos Focus preservados.** Hashes SHA-256 del precheck conservados para `ModelViewer.tsx`, `component-isolation.d.mts`, `component-isolation.mjs`, `component-mapping.mjs`, `component-mesh-map.json`, `tests/component-isolation.test.mjs` y el informe original. GaragePage conserva la llamada y la limpieza especial de actualizaciones sin pieza; sólo incorpora contadores y temporada. No se rediseñaron shaders, materiales, hotspots ni cámaras.

5. **Terminología.** Se reemplazó el contador de PRESENTADAS/SIN PRESENTACIONES por ACTUALIZACIONES mediante `garageUpdateCount`, centralizado en i18n para ES/EN/IT/PT/FR/DE. Panel Componentes y barra de equipos usan el mismo formateador. Se quitó también el cero inicial del total de registros en Actualizaciones. Los estados técnicos FIA internos y su terminología se conservan.

6. **0/1/N.** ES: `SIN ACTUALIZACIONES`, `1 ACTUALIZACIÓN`, `8 ACTUALIZACIONES`. Sin padding numérico. `publishedUpdateCounts` suma todas las filas published y no consulta componentId, visualizable, hotspots, meshes ni highlightability. La frontera de datos rechaza estados no publicados, año incorrecto o GP incorrecto; el pipeline sigue validando los hechos antes de publicar.

7. **Arquitectura dinámica.** `official-calendar.mjs` resuelve fuentes actuales; `src/domain/calendar.mjs` comparte selección cronológica, temporadas, FP1 y ventanas entre Node y UI. `scheduled.mjs` ejecuta discovery/preflight/pipeline explícitamente para el evento resuelto. El guard de auto-publicación sigue validando el dataset y la allowlist. Registries numéricos de temporada se descubren automáticamente por filesystem en Node y glob de Vite en UI.

8. **Fuentes.** FIA: [calendario actual 2026](https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-fia-formula-one-world-championship), identidad, cancelaciones e índices/documentos. F1/FOM: [calendario actual](https://www.formula1.com/en/racing/2026) y [race hub Bahrain/ Malaysia](https://www.formula1.com/en/racing/2026/bahrain), rangos de fechas y sesiones precisas. Sólo estos dominios oficiales. No calendarios de terceros.

9. **Cambios de calendario.** Cada ejecución consulta ambas fuentes actuales. Fechas de FOM y cancelaciones FIA sustituyen la información inicial para la vigilancia; venue completo y país del circuito se resuelven desde el race hub. Se conservan IDs internos. La tabla de identidades enlaza nombre FIA ↔ slug F1; puede ampliarse con un `f1Slug` explícito en un nuevo registry. Eventos nuevos sin mapping, fuentes incompletas, identidad dudosa o fechas contradictorias entre el calendario F1 y su sesión generan manual_review/diagnóstico, sin inventar IDs ni publicar. Una indisponibilidad de red genera error visible, no NO_DOCUMENT_FOUND ficticio. El registry inicial/histórico no se reescribe.

10. **FP1.** Se lee la sesión oficial `p1` o Practice número 1 en el JSON estructurado del race hub. El stream se decodifica como JSON sin ejecutar JavaScript remoto. Un Sprint weekend conserva esa primera práctica. Sin FP1 inequívoca no se fabrica un horario. El sistema no usa nombres de días ni reglas jueves/viernes.

11. **Timezones.** Se conservan hora local, offset oficial, IANA timezone y UTC. El offset se verifica con `Intl.DateTimeFormat`. Las decisiones usan milisegundos UTC. El final local del evento usa IANA y contempla DST, sin reutilizar ciegamente el offset de FP1.

12. **Ventana.** FP1 − 8 h a FP1 + 4 h inclusive, cadence genérica de 30 minutos. Después: catch-up cada dos horas, hasta las 23:59:59 locales del último día del evento. No cambia el cron por GP. FUERA: success/skip, sin consultar documentos. DENTRO: discovery exacto. Documento ausente: success. Documento previamente publicado: se verifica el hash real de sus bytes y devuelve UNCHANGED cuando coincide; detecta incluso una revisión en la misma URL. UNCHANGED evita npm ci, extracción, suite de tests y commit/push. Se mantiene una consulta al índice y, si corresponde, al PDF para comprobar sus bytes.

13. **Caso Sepang resuelto desde las fuentes actuales.** Identidad `Bahrain Grand Prix`, ID `bahrain-2026`; Sepang International Circuit, Malaysia; 2–4 octubre 2026. Timezone `Asia/Kuala_Lumpur`.

| Hito | Malaysia UTC+8 | UTC | Argentina UTC−3 |
|---|---|---|---|
| FP1 | 2 oct 12:30 | 2 oct 04:30 | 2 oct 01:30 |
| Inicio vigilancia | 2 oct 04:30 | 1 oct 20:30 | 1 oct 17:30 |
| Fin vigilancia intensiva | 2 oct 16:30 | 2 oct 08:30 | 2 oct 05:30 |
| Fin catch-up | 4 oct 23:59:59 | 4 oct 15:59:59 | 4 oct 12:59:59 |
| Primera búsqueda prevista por el cron propuesto | 2 oct 04:47 | 1 oct 20:47 | 1 oct 17:47 |

14. **Documento actual y dry-run.** Consulta real el 30 septiembre: `NO_DOCUMENT_FOUND`; el índice oficial Bahrain y/o el bloque Bahrain del índice de temporada no anuncian Car Presentation Submissions. Los otros documentos no se aceptan por parecido. Comando read-only: `node --use-system-ca ingestion/fia/scheduled.mjs --check-now=true`. Sin `--publish=true`: no modifica datasets. Esta inspección puntual permite verificar el documento fuera de ventana; el flujo scheduled normal no hace esa consulta fuera de ventana. Evidencia en `ingestion/output/sepang-dynamic-dry-run.json`.

15. **GitHub Actions.** Cron único genérico `17,47 * * * *`, las 24 horas UTC para cubrir FP1 nocturna de Argentina. Primero resolución oficial ligera; después preflight sólo en ventana; dependencias/pipeline/tests/guard sólo si hay documento nuevo o bytes diferentes. Se conserva checkout main, protección de rutas, publicación atómica y prohibición de bypass de branch protection. NO_DOCUMENT_FOUND y UNCHANGED no producen commit. YAML parseado y guards/cadence validados. Estas modificaciones están locales en dev: el workflow remoto todavía necesita recibir los cambios por el proceso habitual del usuario. GitHub ejecuta cron con retrasos posibles; 20:47 UTC es el primer slot previsto, no una garantía de inicio.

16. **Selector de año.** A la izquierda del GP, mismo control y menú nativo. Actualmente muestra sólo 2026 porque sólo ese registry está soportado. Agregar `data/grands-prix/2027.json` añade la temporada automáticamente; no se creó tal archivo ni datasets ficticios 2027. Selectores con labels accesibles e i18n.

17. **Año actual.** Default: año del sistema si está soportado; de lo contrario la temporada soportada más reciente. La navegación explícita a un GP determina su año. Sin default eterno 2026.

18. **Último published por temporada.** Tras consultar datasets reales se selecciona su GP más reciente. Inicialmente se aprovecha el contexto de eventos ya marcados como completados para evitar un salto a un futuro mientras se carga. Las fechas y circuito de datasets publicados se usan en la vista derivada, por lo que un evento movido conserva el orden real al publicarse. El próximo evento del calendario no impone el default del Garage. Al cambiar año se filtran sus GP y se selecciona su latest published; si no hay datos, contexto actual/próximo/primero seguro con contador vacío. Caché de datasets por año + ID; sin reutilizar otro año.

19. **Deep links.** Se mantienen `?gp=...&team=...`. No se agregó `season=` redundante. Un GP histórico registrado selecciona automáticamente su año/GP y se conserva al reload. Sin GP explícito, la apertura usa latest published del año seleccionado por default. Verificado también con reloj de navegador en 2027 y deep link Australia 2026.

20. **QA desktop.** 1366×768 y 1440×900: selectores alineados, cuatro dígitos del año legibles, GP ES correcto, menú de opciones blanco/texto oscuro, sin overflow horizontal ni solapamiento. Contadores 0, 1 y 8 verificados con datasets reales; sin leading zero. Se conserva el tamaño de la barra/canvas; el texto largo de cero puede envolver dentro del botón. Capturas revisadas. Viewports adicionales de Focus: 1440×1000.

21. **QA mobile.** 390×844: año y GP en una fila compacta, sin overflow; texto completo y espacio del coche preservado. Menú nativo móvil sin override de colores de desktop. Reload, deep link y GP sin dataset verificados. Edge headless/SwiftShader con viewport móvil; no prueba en teléfono físico.

22. **Azerbaiyán.** 38 filas published; McLaren 8. ES continúa `GRAN PREMIO DE AZERBAIYÁN 2026` y la traducción completa de las cuatro columnas FIA. No se tocaron textos, hashes ni URLs fuente.

23. **Madrid.** 10 published; Mercedes 3; Red Bull Racing 2. Cantidades, traducciones y datasets históricos intactos; pruebas de hashes históricas aprobadas.

24. **Regresión Focus.** QA WebGL del build de producción: McLaren piso/pontones/ambos alerones, Red Bull Espejos sin highlight después de Piso, Alpine alerones en Italia/piso en Madrid; cierre, reset y cambios componente/equipo/GP/asset. Móviles McLaren/Alpine. Ganancias 1/0.28 y restore exactos, geometrías/materiales/asignaciones estables, livery y sombras preservadas; cero page errors y warnings WebGL/Three relevantes. GLB SHA-256 originales validados.

25. **Tests.** `npm test`: 97 aprobados, 0 fallos, 0 omitidos localmente. 24 tests nuevos de calendario/temporadas/contadores, incluidos viernes/jueves/Sprint, Sepang UTC/Argentina, IANA/DST, ventana/catch-up, skip/discovery/NO_DOCUMENT, fecha/venue/horario movidos, cancelación, identidad desconocida, próximos/current/lastFinished, latest published independiente y reprogramado, años 2026/2027 sintéticos, deep links, año sin dataset y counts ajenos al 3D. Los 12 tests Focus previos siguen pasando. Fixture de sesiones Sepang derivada del JSON oficial, con provenance URL/fecha. Las pruebas de workflow anteriores se adaptaron a la nueva ruta; los helpers de fecha del backfill legacy siguen cubiertos, pero ya no gobiernan Actions.

26. **Lint.** `npm run lint`: aprobado.

27. **Build.** `npm run build`: aprobado. Sólo el aviso preexistente de chunk grande del Garage. No se agregaron dependencias.

28. **Diff-check.** `git diff --check`: aprobado. Archivos nuevos comprobados también por whitespace y marcadores de conflicto. YAML validado con js-yaml. Advertencias LF→CRLF de Git son configuración de line endings, no errores de diff-check.

29. **Archivos del cambio.**

- Workflow: `.github/workflows/fia-auto-publish.yml`.
- Node: `ingestion/fia/auto-publish.mjs`, `backfill.mjs`, `events.mjs`, `finder.mjs`; nuevos `official-calendar.mjs`, `scheduled.mjs`.
- Identidades oficiales: nuevo `data/grands-prix/f1-identities.json`; `data/grands-prix/2026.json` intacto.
- Calendario/temporadas: nuevos `src/domain/calendar.mjs`, `calendar.d.mts`, `src/data/grands-prix/index.ts`; extensión de estado cancelled en `src/domain/grand-prix.ts`.
- UI: `src/features/garage/GaragePage.tsx`, `data.ts`, `src/features/updates/UpdatesPage.tsx`, `src/styles/garage.css`, `src/i18n/index.ts`; nuevos `src/i18n/update-count.mjs`, `update-count.d.mts`.
- Frontera published: `src/services/fia/published-dataset.ts`; nuevos `update-counts.mjs`, `update-counts.d.mts`.
- Tests: `tests/fia-ingestion.test.mjs`; nuevos `tests/calendar-season.test.mjs`, `tests/fixtures/official-sepang-sessions.json`.
- Este informe: `docs/focus-counters-calendar-season-2026-09-30.md`.
- Focus V2 anterior sigue pendiente en el working tree: `src/three/ModelViewer.tsx`, los cuatro archivos component-* de 3D, `tests/component-isolation.test.mjs` y `docs/component-focus-v2-2026-09-30.md`. Sus hashes del precheck se conservaron.

Capturas/helpers/reportes de QA y backup local quedan en `ingestion/output/`, ignorado por Git. No cambios a GLB, colores, hotspots, shaders, sourceText/sourceUrl/hashes FIA, datasets históricos, traducciones técnicas ni Netlify/branding.

30. **Entrega local.** Sin commit, push ni deploy; sin cambio de rama, reset, aplicación ni descarte de stash. El working tree contiene Focus V2 completo más este cierre. Stash conservado para revisión/limpieza posterior por el usuario.
