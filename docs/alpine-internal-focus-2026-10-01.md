# Alpine: inventario y Component Focus (2026-10-01)

## Estado inicial y alcance
Rama dev limpia al comenzar. HEAD local, origin/dev y consulta remota real: 0fb97e66207f01f723be28fad838dc82c5fdee0e.
El GLB actual tiene SHA-256 a398ea532f3b6d71f434b5a86cfb6ef558019107ff71ac24fb4c87f99e7f90d6.
Contiene 499 nodos runtime (incluida Scene) y 498 meshes. El informe anterior de 13 nodos corresponde a otra geometría y NO describe este archivo. El mapping anterior no resolvía los targets del GLB actual.

## Inventario reproducible
Ejecutar `node scripts/alpine-inventory.mjs` desde el repositorio.
[Inventario JSON](alpine-v2-inventory.json) incluye nombres originales, jerarquía, matrices, materiales GLTF/PBR, bounds y centros mundiales antes de la escala del visor (1.1), targets por componente y evidencia de oclusión. Los UUID runtime se omiten para mantener reproducibilidad. Los objetos completos sin reglas topológicas se inventarían como superficies completas; no se segmentan arbitrariamente.

## Mapping inicial
Se conserva la capa por asset existente. Solo cambia la entrada Alpine; BGRT permanece idéntica.
- frontWing: FRONTWING, FW_ENDPLATE, FW_ATTACHMENT y FW_STICKER.
- rearWing: REARWING, RW, piezas DRS explícitas, tornillos/stickers y gurneys. No se afirma que todo el alerón sea el mecanismo DRS.
- halo: meshes etiquetados HALO.
- frontSuspension / rearSuspension: SUSP_LF/RF y SUSP_LR/RR.
- mirrors: MIRROR_L/R.
- frontWheels / rearWheels / wheels: neumáticos y meshes de rueda de los cuatro corners.
- chassis: superficies etiquetadas COCKPIT. No representa toda la carrocería ni el chasis estructural completo.
- frontCorner / rearCorner: hubs explícitos, suspensión y ruedas. Un hub NO se identifica como disco o pinza de freno.
- cooling: GEO_CB2_RADIATORS_492, modo interno ghost.

Se excluyen objetos con extensión mundial máxima <= 0.001: numerosas variantes de equipos/LOD están colapsadas a escala microscópica. No se modifican ni se ocultan del modelo original.

409 superficies completas no asignadas quedan unknown/manual-review en el inventario. Los nombres BODY, CB1/CB2 y B1/B2 no permiten asignar toda su geometría a una pieza única.
Nariz, piso, pontones, cubierta del motor, difusor, frenos delanteros/traseros, volante y cámara onboard necesitan revisión visual/geométrica adicional. No se afirma que estén ausentes: no existe un mapping suficientemente fiable para destacarlos.
GEO_GEN_ENGINE_AL es una variante colapsada, no evidencia de un motor interno utilizable. Pedales y columna de dirección sí tienen nombres explícitos, pero no tienen componentId independiente en la UI actual.

## Oclusión y ghost
Radiadores: 8 muestras de vértices, 8 rayos laterales bloqueados por triángulos originales del coche antes de alcanzar el target. Es evidencia dependiente de la vista, no una identificación de todos los mecanismos internos.
El modo interno se activa automáticamente por metadata del asset. Target con opacity=1, ganancia=1 al terminar la transición, depthTest=false y depthWrite=false. Resto con opacity=0.10, transparent=true, depthWrite=false y ganancia=0.28.
Se usan clones privados restaurables de los materiales Standard/Physical originales; no se cambian texturas, colores, clearcoat ni parámetros PBR globales. No se cambia renderOrder. El target se dibuja opaco y los oclusores se mezclan después como contexto tenue; puede recibir una leve superposición del ghost.
Cada selección restaura opacity/transparent/depthWrite/depthTest originales antes de aplicar el siguiente modo. Dispose restaura referencias de materiales/geometría, flags de sombra y renderOrder. Restablecer y cambios de equipo/GP limpian la selección mediante el flujo existente y la cámara vuelve a su vista por defecto.
La cámara queda habilitada solo si el controlador realmente validó el componente. Sin mapping válido se conserva el detalle textual y no se enfoca otra pieza.
Futuros meshes profundos podrían usar clipping planes temporales, sin boolean ni modificación del GLB.

## Integridad y validación
Cada objeto seleccionado tiene hashes de posiciones/índices. Un cambio de geometría invalida su componente; los composites exigen todos sus constituyentes. El generador scripts/alpine-fingerprints.mjs es una herramienta de autoría: no regenerar para aceptar un modelo nuevo sin revisar el mapping.
121 pruebas aprobadas, cero fallos ni skips. Incluyen integridad SHA/nombres, oclusión de radiadores, fingerprints, repetidas transiciones ghost/external/reset, restauración de propiedades y preservación PBR. Pruebas BGRT conservadas.
Build correcto (aviso existente de chunk >500 kB). Typecheck y diff --check ejecutados.
No se obtuvo evidencia visual WebGL ni capturas nuevas en esta entrega; el modo ghost está verificado por estados/materiales y auditoría CPU, pendiente de evaluación estética en Garage.

## Archivos
src/three/component-mesh-map.json, component-mapping.mjs, component-isolation.mjs, component-isolation.d.mts, ModelViewer.tsx.
scripts/alpine-inventory.mjs y alpine-fingerprints.mjs.
tests/alpine-internal-focus.test.mjs y regresiones alpine-v2-component-focus, component-isolation, component-focus-v3.
docs/alpine-v2-inventory.json y este informe.

GLB, fondo/layout, iluminación, livery, registro de equipos y selección BGRT/Apex no modificados. Sin commit, push, merge ni deploy. Los cambios quedan en dev para revisión.
