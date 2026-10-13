# Component Focus — auditoría del dev actual

HEAD remoto dev y HEAD local inicial: **bf02df8e8c81b9962a6da5d4d1fbd47a8d00ac54**. Rama local dev limpia antes de modificar. No commit, push, merge, deploy ni operaciones sobre main.

## Resultado

Los once GLB de public/models comparten exactamente los 490 meshes, nombres, jerarquía, transforms, cantidades de vértices/triángulos y hashes de posiciones/índices. Firma común: **9590a573358418750cb77d2bdbf9b8aa94706172201407ab51fb31850dfcf833**. El inventario excluye materiales de la firma porque las skins difieren; sí registra sus nombres y SHA-256 individuales. 490 nodos fuente, 491 nodos runtime contando Scene. Un único mapping y cámaras se reutilizan en los once equipos, con fingerprints individuales de cada selector para rechazar cambios futuros incompatibles.

En HEAD sólo Alpine tenía mapping. Sus targets rearWing fallaban por cuatro nodos ausentes (SCREWS_DRS_430, SCREWS_RW_451, STICKERS_DRS_432, STICKERS_RW_B_457) y un fingerprint obsoleto de GEO_MAIN_STICKERS_RW_454. Se retiraron sólo los auxiliares ausentes y se actualizó el fingerprint de ese sticker real del conjunto trasero. Ahora hay 13 categorías runtime válidas en cada equipo; ocho aparecen en el panel.

A = CONFIRMABLE_AUTOMATICAMENTE. B = NECESITA_CONFIRMACION_BLENDER. C = NO_PRESENTE_O_NO_SEPARABLE. No se afirma C para ninguna de las ocho piezas pendientes: los nombres genéricos y bounds no prueban ausencia ni imposibilidad de separar islas. No se asignan meshes completos que mezclan regiones. Las ocho B permanecen sin resaltado ni cámara automática.

## Panel completo

Cámara A: P = posición, T = target, coordenadas mundiales con escala 1.1. Cámara B: propuesta cualitativa; se calculará sobre los bounds después de confirmar la superficie.

| Componente | Estado | Meshes / candidatos exactos | Cámara | Ayuda |
|---|---|---|---|---|
| Alerón delantero | A | `GEO_CB1_FW_ENDPLATE_L_459`<br>`GEO_CB1_FW_ENDPLATE_R_463`<br>`GEO_EXT_FW_ATTACHMENT_471`<br>`GEO_EXT_FW_ENDPLATE_L_460`<br>`GEO_EXT_FW_ENDPLATE_R_464`<br>`GEO_MAIN_FRONTWING_SUB0_467`<br>`GEO_MAIN_FRONTWING_SUB1_468`<br>`GEO_MAIN_FRONTWING_SUB2_469`<br>`GEO_MAIN_FRONTWING_SUB3_470`<br>`GEO_MAIN_FW_ENDPLATE_L_462`<br>`GEO_MAIN_FW_ENDPLATE_R_466`<br>`GEO_MAIN_FW_STICKER_422` | P [2.6,2.1,5.2]; T [0,0.24,2.72] | No; mapping validado |
| Nariz | B | `GEO_MAIN_BODY_1_362`<br>`GEO_CB1_1_344`<br>`GEO_CB1_4_347`<br>`GEO_CB2_4_349` | 3/4 frontal alto; target sobre la nariz confirmada | Una captura de la categoría |
| Piso | B | `GEO_CB1_3_346`<br>`GEO_CB1_1_344`<br>`GEO_CB1_B1_0`<br>`GEO_MAIN_STICKERS_368` | inferior lateral; encuadre del piso confirmado | Una captura de la categoría |
| Difusor | B | `GEO_CB1_1_344`<br>`GEO_CB1_3_346`<br>`GEO_MAIN_STICKERS_368` | inferior trasera; target en salida del difusor | Una captura de la categoría |
| Alerón trasero | A | `GEO_CB1_RW_450`<br>`GEO_CB1_RW_455`<br>`GEO_CB1_RW_SKINNED_495`<br>`GEO_EXT_DRS_1_423`<br>`GEO_EXT_DRS_2_425`<br>`GEO_EXT_DRS_3_426`<br>`GEO_EXT_DRS_4_424`<br>`GEO_EXT_DRS_5_428`<br>`GEO_GEN_DRS_1_427`<br>`GEO_GEN_DRS_2_429`<br>`GEO_GEN_RW_452`<br>`GEO_MAIN_DRS_431`<br>`GEO_MAIN_REARWING_453`<br>`GEO_MAIN_STICKERS_RW_454` | P [2.5,2.2,-5.2]; T [0,0.94,-2.35] | No; mapping validado |
| Pontones | B | `GEO_MAIN_BODY_2_364`<br>`GEO_CB1_2_345`<br>`GEO_CB2_2_348` | lateral alto; abarcar ambos pontones | Una captura de la categoría |
| Refrigeración | A | `GEO_CB2_RADIATORS_492` | P [3.4,1.7,0.6]; T [0,0.225,-0.58] | No; mapping validado |
| Cubierta del motor | B | `GEO_MAIN_BODY_2_364`<br>`GEO_CB1_2_345`<br>`GEO_CB1_4_347`<br>`GEO_CB2_2_348` | 3/4 trasera alta | Una captura de la categoría |
| Caja de aire/Airbox | B | `GEO_MAIN_BODY_2_364`<br>`GEO_MAIN_BODY_4_367`<br>`GEO_CB1_4_347`<br>`GEO_CB2_2_348` | 3/4 frontal alta; entrada sobre cockpit | Una captura de la categoría |
| Cockpit | A | `GEO_GEN_COCKPIT_1_HR_81`<br>`GEO_GEN_COCKPIT_1_LR_287`<br>`GEO_GEN_COCKPIT_2_HR_82`<br>`GEO_GEN_COCKPIT_2_LR_288`<br>`GEO_INT_COCKPIT_1_HR_83`<br>`GEO_INT_COCKPIT_1_LR_289`<br>`GEO_INT_COCKPIT_2_HR_84`<br>`GEO_INT_COCKPIT_3_HR_493` | P [2.4,3,3]; T [0,0.55,0.65] | No; mapping validado |
| Halo | A | `GEO_MAIN_HALO_HR_86`<br>`GEO_MAIN_HALO_LR_290`<br>`GEO_MAIN_STICKER_HALO_HR_87`<br>`GEO_MAIN_STICKER_HALO_LR_291`<br>+ islas validadas BODY_3 y STICKERS; ver anexo | P [-2.5,3,3]; T [0,0.9,0.4] | No; mapping validado |
| Suspensión delantera | A | `GEO_CB1_SUSP_LF_A_472`<br>`GEO_CB1_SUSP_LF_B_476`<br>`GEO_CB1_SUSP_LF_C_382`<br>`GEO_CB1_SUSP_LF_D_480`<br>`GEO_CB1_SUSP_RF_A_474`<br>`GEO_CB1_SUSP_RF_B_478`<br>`GEO_CB1_SUSP_RF_C_401`<br>`GEO_CB1_SUSP_RF_D_481`<br>`GEO_MAIN_SUSP_LF_A_473`<br>`GEO_MAIN_SUSP_LF_B_477`<br>`GEO_MAIN_SUSP_LF_C_383`<br>`GEO_MAIN_SUSP_RF_A_475`<br>`GEO_MAIN_SUSP_RF_B_479`<br>`GEO_MAIN_SUSP_RF_C_400` | P [-2.7,3.1,4.4]; T [0,0.49,1.76] | No; mapping validado |
| Suspensión trasera | A | `GEO_CB1_SUSP_LR_A_482`<br>`GEO_CB1_SUSP_LR_B_484`<br>`GEO_CB1_SUSP_LR_C_486`<br>`GEO_CB1_SUSP_LR_D_488`<br>`GEO_CB1_SUSP_RR_A_483`<br>`GEO_CB1_SUSP_RR_B_485`<br>`GEO_CB1_SUSP_RR_C_487`<br>`GEO_CB1_SUSP_RR_D_489` | P [-1.5,4.8,-4.2]; T [0,0.48,-1.75] | No; mapping validado |
| Ruedas/neumáticos | A | 24 targets exactos: WHEEL/TIRE LF/RF/LR/RR; ver anexo | P [4,2.5,4.5]; T [0,0.39,0] | No; mapping validado |
| Frenos delanteros | B | `GEO_CB1_HUB_LF_381`<br>`GEO_CB1_HUB_RF_399`<br>`GEO_MAIN_HUB_LF_384`<br>`GEO_MAIN_HUB_RF_402` | interior del eje delantero; ghost sólo si hay disco/pinza real | Una captura de la categoría |
| Frenos traseros | B | `GEO_CB1_HUB_LR_391`<br>`GEO_CB1_HUB_RR_409` | interior del eje trasero; ghost sólo si hay disco/pinza real | Una captura de la categoría |

## Evidencia y ocho capturas necesarias

Abrir uno de los GLB actuales (cualquiera de los once basta) en Blender. Ejecutar blender-selector.py en el editor de texto; después inicializar la consola una vez con `ft_focus = bpy.app.driver_namespace['ft_focus']; ft_restore = bpy.app.driver_namespace['ft_restore']` y pegar cada llamada. Mantener el Outliner visible y señalar la superficie relevante. Cambia sólo selección, nombres visibles y ocultación temporal; ft_restore() restaura esos estados. No modifica geometría, materiales ni archivos. Si se usa el .blend de origen, acepta el nombre exacto sin el sufijo numérico de export sólo cuando hay una coincidencia única; imprime la correspondencia o el nombre no resuelto.

1. **Nariz**: `ft_focus('nose')`. ¿Qué superficie es la nariz propiamente dicha, sin alerón/cockpit? BODY_1 contiene una isla candidata firstTriangle=7294, 4884 triángulos, z=1.8604–2.9900; CB1_1 otra en 17560, 1392 triángulos, z=1.8594–2.6070. Una captura señalando ambas superficies o indicando cuál pertenece a la nariz basta.
2. **Piso**: `ft_focus('floor')`. Vista inferior: señalar plano principal y borde. CB1_3 tiene 44 islas significativas y bounds y=0.0928–0.3053; CB1_1 mezcla fondo central y otras zonas. CB1_B1 es delantero y puede ser un dispositivo cercano al piso; no se lo supone parte del plano.
3. **Difusor**: `ft_focus('diffuser')`. Vista posterior inferior: señalar canales/salida, diferenciarlos del fondo y transmisión. CB1_1 incluye superficies traseras laterales en 3236/3242 y 21492/21498, pero su posición no prueba que sean difusor.
4. **Pontones**: `ft_focus('sidepods')`. Vista lateral: señalar superficie externa y entrada. BODY_2 contiene dos islas de 12415 triángulos (0 y 17781) que abarcan z=-1.6172–0.4790 y y=0.1495–1.0376; podrían mezclar pontones y cubierta.
5. **Cubierta del motor**: `ft_focus('engineCover')`. Vista 3/4 posterior: ¿la cubierta está en una isla separada de los pontones o forma parte de esas mismas superficies continuas? Si está fusionada, señalar límite aproximado, sin editar.
6. **Airbox**: `ft_focus('airbox')`. Vista frontal alta: señalar la boca y su contorno, excluir soporte/cámara superior. BODY_2 incluye islas altas (595, 669, 672, 677, 18376, 18450); BODY_4 es una pieza pequeña en y=1.1001–1.1404 y podría ser un accesorio superior. No se usa engineCover como sustituto de Airbox.
7. **Frenos delanteros**: `ft_focus('frontBrake')`. Vista interior de rueda delantera: ¿algún HUB contiene disco, pinza o sólo portamangueta/conducto? Señalar disco y pinza si existen. Los pedales BRAKE_PEDAL quedan excluidos.
8. **Frenos traseros**: `ft_focus('rearBrake')`. Vista interior de rueda trasera: misma identificación; HUB no demuestra por sí solo un freno.

Si la selección incluye varias piezas, entrar a Edit Mode, señalar una cara y usar L para seleccionar su isla conectada; la captura debe mostrar qué parte queda seleccionada. No separar ni reexportar. Volver a Object Mode antes de otra llamada; restaurar con ft_restore(). La captura puede justificar un mapping por islas que ya admite el runtime. Si la superficie está conectada a otra pieza y no tiene grupo/material semántico fiable, pasará a C.

## Alternativas si se confirma C

- Nariz, pontones, cubierta y airbox: vista fija de la región con coche a brillo normal; marcador explicativo sin afirmar aislamiento.
- Piso y difusor fusionados: vista inferior/posterior sin oscurecer. Ghost parcial sólo sobre grupos exteriores ya confirmados; no cortar triángulos por coordenadas.
- Frenos ausentes o fusionados al hub: vista del conjunto rueda/suspensión como contexto, manteniendo el detalle factual del freno; no etiquetar hub como disco/pinza ni inventar interiores.

Estas alternativas quedan documentadas, sin implementarlas como si fueran focos confirmados. Confirmar las islas en Blender puede evitar editar el GLB.

## Mapping exacto reutilizado

- **frontWing**: `GEO_CB1_FW_ENDPLATE_L_459`, `GEO_CB1_FW_ENDPLATE_R_463`, `GEO_EXT_FW_ATTACHMENT_471`, `GEO_EXT_FW_ENDPLATE_L_460`, `GEO_EXT_FW_ENDPLATE_R_464`, `GEO_MAIN_FRONTWING_SUB0_467`, `GEO_MAIN_FRONTWING_SUB1_468`, `GEO_MAIN_FRONTWING_SUB2_469`, `GEO_MAIN_FRONTWING_SUB3_470`, `GEO_MAIN_FW_ENDPLATE_L_462`, `GEO_MAIN_FW_ENDPLATE_R_466`, `GEO_MAIN_FW_STICKER_422`.
- **rearWing**: `GEO_CB1_RW_450`, `GEO_CB1_RW_455`, `GEO_CB1_RW_SKINNED_495`, `GEO_EXT_DRS_1_423`, `GEO_EXT_DRS_2_425`, `GEO_EXT_DRS_3_426`, `GEO_EXT_DRS_4_424`, `GEO_EXT_DRS_5_428`, `GEO_GEN_DRS_1_427`, `GEO_GEN_DRS_2_429`, `GEO_GEN_RW_452`, `GEO_MAIN_DRS_431`, `GEO_MAIN_REARWING_453`, `GEO_MAIN_STICKERS_RW_454`.
- **halo**: `GEO_MAIN_HALO_HR_86`, `GEO_MAIN_HALO_LR_290`, `GEO_MAIN_STICKER_HALO_HR_87`, `GEO_MAIN_STICKER_HALO_LR_291`.
- **frontSuspension**: `GEO_CB1_SUSP_LF_A_472`, `GEO_CB1_SUSP_LF_B_476`, `GEO_CB1_SUSP_LF_C_382`, `GEO_CB1_SUSP_LF_D_480`, `GEO_CB1_SUSP_RF_A_474`, `GEO_CB1_SUSP_RF_B_478`, `GEO_CB1_SUSP_RF_C_401`, `GEO_CB1_SUSP_RF_D_481`, `GEO_MAIN_SUSP_LF_A_473`, `GEO_MAIN_SUSP_LF_B_477`, `GEO_MAIN_SUSP_LF_C_383`, `GEO_MAIN_SUSP_RF_A_475`, `GEO_MAIN_SUSP_RF_B_479`, `GEO_MAIN_SUSP_RF_C_400`.
- **rearSuspension**: `GEO_CB1_SUSP_LR_A_482`, `GEO_CB1_SUSP_LR_B_484`, `GEO_CB1_SUSP_LR_C_486`, `GEO_CB1_SUSP_LR_D_488`, `GEO_CB1_SUSP_RR_A_483`, `GEO_CB1_SUSP_RR_B_485`, `GEO_CB1_SUSP_RR_C_487`, `GEO_CB1_SUSP_RR_D_489`.
- **mirrors**: `MIRROR_L_370`, `MIRROR_R_371`.
- **frontWheels**: `GEO_WHEEL_BLUR_A_LF_376`, `GEO_WHEEL_BLUR_A_RF_394`, `GEO_WHEEL_BLUR_B_LF_377`, `GEO_WHEEL_BLUR_B_RF_395`, `GEO_WHEEL_FIXED_LF_375`, `GEO_WHEEL_FIXED_RF_393`, `GEO_WHEEL_STATIC_LF_378`, `GEO_WHEEL_STATIC_RF_396`, `TIRE_LF_SUB0_380`, `TIRE_LF_SUB1_379`, `TIRE_RF_SUB0_398`, `TIRE_RF_SUB1_397`.
- **rearWheels**: `GEO_WHEEL_BLUR_A_LR_386`, `GEO_WHEEL_BLUR_A_RR_404`, `GEO_WHEEL_BLUR_B_LR_387`, `GEO_WHEEL_BLUR_B_RR_405`, `GEO_WHEEL_FIXED_LR_385`, `GEO_WHEEL_FIXED_RR_403`, `GEO_WHEEL_STATIC_LR_388`, `GEO_WHEEL_STATIC_RR_406`, `TIRE_LR_SUB0_390`, `TIRE_LR_SUB1_389`, `TIRE_RR_SUB0_408`, `TIRE_RR_SUB1_407`.
- **cooling**: `GEO_CB2_RADIATORS_492`.
- **chassis**: `GEO_GEN_COCKPIT_1_HR_81`, `GEO_GEN_COCKPIT_1_LR_287`, `GEO_GEN_COCKPIT_2_HR_82`, `GEO_GEN_COCKPIT_2_LR_288`, `GEO_INT_COCKPIT_1_HR_83`, `GEO_INT_COCKPIT_1_LR_289`, `GEO_INT_COCKPIT_2_HR_84`, `GEO_INT_COCKPIT_3_HR_493`.
- **frontCorner**: `GEO_CB1_HUB_LF_381`, `GEO_CB1_HUB_RF_399`, `GEO_MAIN_HUB_LF_384`, `GEO_MAIN_HUB_RF_402`.
- **rearCorner**: `GEO_CB1_HUB_LR_391`, `GEO_CB1_HUB_RR_409`.
- **halo**, mesh `GEO_MAIN_BODY_3_366`, islas 0 (3954 triángulos), 33 (3688 triángulos), 77 (247 triángulos), 16605 (247 triángulos), 3779 (228 triángulos), 20307 (228 triángulos); fingerprint obligatorio.
- **halo**, mesh `GEO_MAIN_STICKERS_368`, islas 2398 (3502 triángulos), 6642 (575 triángulos), 16423 (575 triángulos); fingerprint obligatorio.

Los composites wheels, frontCorner y rearCorner conservan sus constituyentes validados; espejos y ruedas por eje tienen cámaras existentes aunque no son filas independientes del panel.

## Cambios y límites

component-mapping.mjs registra los once IDs contra la misma tabla. alpine-focus.mjs/d.mts y ModelViewer.tsx aplican la cámara validada a todos los Formula Alpha. component-isolation.mjs usa el perfil compartido para pooling semántico de materiales, contraste del halo y actualización de shaders. Conserva Reset, restores de referencias/flags y dispose idempotente de recursos privados, sin disponer texturas fuente. component-mesh-map.json corrige los auxiliares del alerón y SHA actual. alpine-v2-inventory.json se regenera con 442 islas/superficies desconocidas de esta versión. Pruebas adicionales verifican los once GLB, cámaras, targets, restauración, recursos y rechazo de geometría modificada. La prueba previa de livery ahora comprueba correctamente los materiales sin baseColorTexture.

Sin cambios en GLB, nombres de archivo, datasets FIA, traducciones ni iluminación global. La auditoría usa GLTFLoader real para geometría y omite decodificación de imágenes. Cámaras verificadas por frustum; no se afirma nueva verificación visual WebGL ni rendimiento GPU.

## Verificación

- Suite completa: **170 tests aprobados, 0 fallos, 0 skips**; ejecutada con concurrencia 2. El primer intento con concurrencia automática tuvo un proceso terminado al cargar GLB; las pruebas de ese archivo pasan por separado y en la suite limitada.
- Typecheck: npx tsc -b --pretty false aprobado.
- Lint: npm run lint aprobado. git diff --check aprobado.
- Build completo: npm run build **NO completado**, ENOSPC al copiar public/models/.bgrt-working/F1_Concept_2026/F1_Concept_2026.max. No se modificó ni retiró ese asset de origen.
- Build de aplicación con build.copyPublicDir=false: aprobado; compila los 645 módulos y genera bundles. Omite la copia de public, por lo que esa salida no es un paquete completo desplegable. Persiste aviso de chunks mayores de 500 kB. Se limpió únicamente dist parcial generado por el build fallido, tras verificar ruta absoluta y que no contuviera archivos versionados.
- HEAD remoto dev y HEAD local al cierre: bf02df8e8c81b9962a6da5d4d1fbd47a8d00ac54; rama dev. Cambios locales sin commit. GLB conservan sus hashes individuales; no cambios en datasets, traducciones ni iluminación.
- Selector Blender: preparado para revisión; no ejecutado dentro de Blender en este turno. Se necesita la confirmación visual de las ocho categorías B antes de habilitarlas.
