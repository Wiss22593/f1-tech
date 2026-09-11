import { teams } from '../teams/data'
import type { CarComponentId, F1TechHotspot } from '../../three/assets'
import { grandsPrix2026 } from '../../data/grands-prix/2026'

/** Single visual source of truth for the selector and the 3D car. */
export interface TeamTheme {
  bodyBase: string; bodySecondary: string; accent: string; highlight: string
  carbon: string; metallic: string; glass: string; wheel: string; brake: string
  neutral: string; surface: string; primary: string; secondary: string
  /** Per-team PBR finish values for the cloned BGRT livery material. */
  materialMetalness: number; materialRoughness: number; materialEmissiveIntensity: number
}
export interface UpdateSource { type: 'FIA'; label: string; document: string; date: string }
export interface GarageUpdate {
  id: string; teamId: string; grandPrixId: string; componentId: CarComponentId | null; visualizable?: boolean; status: 'SUBMITTED'
  presentedComponent: string | null; primaryReason: string | null; geometricDifference: string | null; description: string | null
  source: UpdateSource; confidence: 'CONFIRMED'; magnitude: 'BAJA' | 'MEDIA' | 'ALTA'; objective: string; area: string
  analysis?: string; score?: number; circuitFit?: 'ALTO' | 'MEDIO' | 'BAJO'
}

export type GarageContentLocale = 'es' | 'en' | 'it' | 'pt' | 'fr' | 'de'

/** The Garage selector is a view of the canonical event registry, never a second event list. */
export const garageGrandPrix = grandsPrix2026

const theme = (bodyBase: string, bodySecondary: string, accent: string, highlight: string, metallic: string, surface: string, materialMetalness = .58, materialRoughness = .3, materialEmissiveIntensity = .018): TeamTheme => ({ bodyBase, bodySecondary, accent, highlight, metallic, surface, materialMetalness, materialRoughness, materialEmissiveIntensity, carbon: '#101318', glass: '#0a0e14', wheel: '#1b212a', brake: accent, neutral: highlight, primary: bodyBase, secondary: bodySecondary })
export const teamThemes: Record<string, TeamTheme> = {
  mercedes: theme('#182326', '#4f5b61', '#19dbc7', '#d4eeea', '#87949a', '#0d191a', .68, .27, .055),
  ferrari: theme('#dc1628', '#781019', '#ff717b', '#ffe0e2', '#7d8791', '#3a090f', .54, .28),
  mclaren: theme('#f47a18', '#181b20', '#ffc06b', '#fff0d8', '#77818d', '#301a0b', .48, .31),
  'red-bull-racing': theme('#10265a', '#0c1c42', '#e33245', '#f4c51f', '#71809a', '#061126', .56, .29, .034),
  'racing-bulls': theme('#087fd1', '#e9f3f7', '#7be5f2', '#ffffff', '#8796a4', '#0c263e', .46, .3),
  alpine: theme('#0b5cae', '#171d4d', '#ff479b', '#ffd3e8', '#72829b', '#161534', .55, .3, .03),
  haas: theme('#e4e7e8', '#1c2229', '#e02b3a', '#ffffff', '#969fa7', '#1b2026', .38, .35),
  // Titanium and graphite preserve Audi's dark metallic character; white is not a body colour.
  audi: theme('#596166', '#20262c', '#e32b3b', '#d2d8da', '#9aa1a5', '#1a2025', .78, .25),
  williams: theme('#0756b5', '#102b56', '#5aa9ff', '#e1f0ff', '#71849b', '#0c1e3b', .52, .29),
  'aston-martin': theme('#034c36', '#102b25', '#75d2a0', '#d0f1df', '#718b82', '#0b261c', .62, .3),
  cadillac: theme('#14171b', '#e5e8e9', '#aeb9c3', '#ffffff', '#8f979f', '#24282d', .68, .27),
}
export const garageTeams = teams.map((team) => ({ ...team, theme: teamThemes[team.id] }))

const fiaSource: UpdateSource = { type: 'FIA', label: 'FIA Car Presentation Submission', document: '2026 Italian Grand Prix - Car Presentation Submissions', date: '2026-09-04' }
const monza = 'italian-grand-prix-2026'
type Seed = Omit<GarageUpdate, 'id' | 'grandPrixId' | 'source' | 'confidence' | 'status' | 'analysis' | 'score' | 'circuitFit'>
const update = (id: string, seed: Seed): GarageUpdate => ({ id, grandPrixId: monza, status: 'SUBMITTED', source: fiaSource, confidence: 'CONFIRMED', ...seed })

export const garageUpdates: GarageUpdate[] = [
  update('mclaren-rear-wing', { teamId: 'mclaren', componentId: 'rearWing', presentedComponent: 'Rear Wing', primaryReason: 'Performance - Drag reduction', geometricDifference: 'Alternative Straight Line Mode flap position and beamwing.', description: 'The high isochronal rear wing has been modified to deploy the flap to an alternative position in straight line mode in combination with a less loaded beam wing, resulting in a larger reduction in drag.', magnitude: 'MEDIA', objective: 'Reducción de drag', area: 'Aerodinámica' }),
  update('mclaren-floor-furniture', { teamId: 'mclaren', componentId: 'floor', presentedComponent: 'Floor Furniture', primaryReason: 'Performance - Flow Conditioning', geometricDifference: 'Updated floor furniture.', description: 'A small modification to the floor furniture, resulting in better flow conditioning and resultant improvement of aerodynamic performance of the floor as well as drag reduction.', magnitude: 'BAJA', objective: 'Acondicionamiento de flujo', area: 'Aerodinámica' }),
  update('mercedes-rear-wing', { teamId: 'mercedes', componentId: 'rearWing', presentedComponent: 'Rear Wing', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Various winglet devices removed from rear wing.', description: 'Removing the rear wing winglets reduces assembly camber shedding local downforce and drag at a ratio appropriate for Monza L/D.', magnitude: 'MEDIA', objective: 'Rango de drag', area: 'Aerodinámica' }),
  update('mercedes-front-bodywork', { teamId: 'mercedes', componentId: 'nose', presentedComponent: 'Front Bodywork', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Mirror rear stays trimmed.', description: 'The mirror stay trim reduces local camber and loading, shedding local downforce and drag at a ratio appropriate for Monza L/D.', magnitude: 'BAJA', objective: 'Rango de drag', area: 'Carrocería' }),
  update('red-bull-rear-corner', { teamId: 'red-bull-racing', componentId: 'rearSuspension', presentedComponent: 'Rear Corner', primaryReason: 'Reliability', geometricDifference: 'Rear suspension to wheel bodywork gaitor revision.', description: 'To improve reliability of the rear wheel bodywork assembly, the gaitor providing an aerodynamic seal has been changed to reduce the probability of splitting from the wishbone and now removed winglet junctions.', magnitude: 'MEDIA', objective: 'Fiabilidad', area: 'Suspensión' }),
  update('red-bull-floor', { teamId: 'red-bull-racing', componentId: 'floor', presentedComponent: 'Floor Body', primaryReason: 'Performance - Local Load', geometricDifference: 'Revised bib edge profile.', description: 'In seeking to validate an alternative geometry, the edge profile has been revised for evaluation in Monza. The new geometry will revise the flow to create more local load with improved aerodynamic stability.', magnitude: 'MEDIA', objective: 'Carga local', area: 'Aerodinámica' }),
  update('red-bull-tailpipe', { teamId: 'red-bull-racing', componentId: 'engineCover', presentedComponent: 'Exhaust Tailpipe', primaryReason: 'Reliability', geometricDifference: 'Revised tailpipe bracket.', description: 'In order to operate the Power Unit reliably around the Monza circuit with its unique demands, the tailpipe bracket has been trimmed to offer less blockage.', magnitude: 'BAJA', objective: 'Fiabilidad', area: 'Unidad de potencia' }),
  update('red-bull-front-wing', { teamId: 'red-bull-racing', componentId: 'frontWing', presentedComponent: 'Front Wing', primaryReason: 'Flow Conditioning', geometricDifference: 'Revised endplate vane.', description: 'A trimmed front wing end plate dive-plane is available for evaluation in Monza which aims to improve downstream load from the floor.', magnitude: 'BAJA', objective: 'Acondicionamiento de flujo', area: 'Aerodinámica' }),
  update('ferrari-floor-board', { teamId: 'ferrari', componentId: 'floor', presentedComponent: 'Floor Board', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Front floor board elements optimisation, single vertical element.', description: 'Seen as a package, the primary aim of these modifications has been to adapt to Monza circuit peculiarities and car aerodynamic efficiency requirements. All steps target aerodynamic drag saving, with downforce reduction as a natural consequence, but in a favourable ratio for this track.', magnitude: 'MEDIA', objective: 'Rango de drag', area: 'Aerodinámica' }),
  update('ferrari-mirror-stay', { teamId: 'ferrari', componentId: 'sidepods', presentedComponent: 'Mirror Stay', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Shorter mirror vertical stay and connection to sidepod.', description: '', magnitude: 'BAJA', objective: 'Rango de drag', area: 'Carrocería' }),
  update('ferrari-rear-corner', { teamId: 'ferrari', componentId: 'rearBrake', presentedComponent: 'Rear Corner', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Removal of rear brake duct winglet cascade.', description: '', magnitude: 'BAJA', objective: 'Rango de drag', area: 'Frenos' }),
  update('ferrari-rv-tail', { teamId: 'ferrari', componentId: 'rearWing', presentedComponent: 'RV Tail', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'Slotted central winglet element, trimmed side winglets.', description: '', magnitude: 'MEDIA', objective: 'Rango de drag', area: 'Aerodinámica' }),
  update('williams-halo', { teamId: 'williams', componentId: 'halo', presentedComponent: 'Halo', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'A vertical fence has been introduced around the Halo geometry.', description: 'We have modified the local pressure distribution around the driver cockpit area. This results in a downstream flow field change which benefits efficiency levels specific to the Monza circuit.', magnitude: 'BAJA', objective: 'Rango de drag', area: 'Carrocería' }),
  update('williams-front-wing', { teamId: 'williams', componentId: 'frontWing', presentedComponent: 'Front Wing', primaryReason: 'Circuit specific - Balance Range', geometricDifference: 'A reduction in chord of the FWF elements.', description: 'The rearward element on the FW assembly has been modified to suit the balance requirement of the Monza circuit.', magnitude: 'MEDIA', objective: 'Rango de balance', area: 'Aerodinámica' }),
  update('williams-floor-body', { teamId: 'williams', componentId: 'floor', presentedComponent: 'Floor Body', primaryReason: 'Circuit specific - Drag Range', geometricDifference: 'A local trim has been applied to the Floor Board geometry.', description: 'This is a further circuit specific change, altering the balance between downforce and drag at the front of the main floor.', magnitude: 'BAJA', objective: 'Rango de drag', area: 'Aerodinámica' }),
  update('racing-bulls-rear-wing', { teamId: 'racing-bulls', componentId: 'rearWing', presentedComponent: 'Rear Wing', primaryReason: 'Circuit Specific - Drag Range', geometricDifference: 'New assembly with updated SM mechanism.', description: 'The rear wing changes facilitate increased flap travel in Straight Mode. This allows an efficient drag reduction which suits the nature of the circuit.', magnitude: 'MEDIA', objective: 'Rango de drag', area: 'Aerodinámica' }),
  update('racing-bulls-tailpipe', { teamId: 'racing-bulls', componentId: 'engineCover', presentedComponent: 'Exhaust Tailpipe', primaryReason: 'Performance - Flow Conditioning', geometricDifference: 'Repositioned tailpipe with reprofiled bracket.', description: 'The tailpipe updates improve the flow management around the centreline of the car, allowing the floor and rear wing to perform more efficiently.', magnitude: 'MEDIA', objective: 'Acondicionamiento de flujo', area: 'Unidad de potencia' }),
  update('aston-front-suspension', { teamId: 'aston-martin', componentId: 'frontSuspension', presentedComponent: 'Front Suspension', primaryReason: 'Performance - Local Load', geometricDifference: 'Revised fairings for one of the front suspension members.', description: 'The external fairing for one of the front suspension members has been modified to improve alignment with the onset flow.', magnitude: 'BAJA', objective: 'Carga local', area: 'Suspensión' }),
  update('aston-floor-edge', { teamId: 'aston-martin', componentId: 'floor', presentedComponent: 'Floor Edge', primaryReason: 'Performance - Local Load', geometricDifference: 'Update to the area of the floor in front of the rear tyre.', description: 'The geometry in front of the rear tyre has been modified to improve the airflow to the underside of the floor increasing load generated in this area.', magnitude: 'MEDIA', objective: 'Carga local', area: 'Aerodinámica' }),
  update('haas-floor', { teamId: 'haas', componentId: 'floor', presentedComponent: 'Floor', primaryReason: 'Performance - Local Load', geometricDifference: 'New Front Floor - new side geometry and diffuser update.', description: 'The floor update focuses on optimising the main expansion region and associated side geometry to improve airflow behaviour throughout the floor. The revised design increases floor efficiency, delivering a net gain in overall aerodynamic performance and downforce production.', magnitude: 'ALTA', objective: 'Carga local', area: 'Aerodinámica' }),
  update('haas-bodywork', { teamId: 'haas', componentId: 'engineCover', presentedComponent: 'Bodywork', primaryReason: 'Performance - Local Load', geometricDifference: 'New Sidepod and coke-line. Narrower Roll-Hoop and updated engine cover.', description: 'The revised bodywork has been developed in conjunction with the new floor design to maximise the aerodynamic benefit of the floor package. The updated geometry improves airflow management around the car while providing the necessary cooling performance for all operating conditions.', magnitude: 'ALTA', objective: 'Carga local', area: 'Carrocería' }),
  update('haas-rear-corner', { teamId: 'haas', componentId: 'rearSuspension', presentedComponent: 'Rear Corner', primaryReason: 'Performance - Local Load', geometricDifference: 'Realigned rear suspension fairings and drum deflectors.', description: 'The aerodynamic changes introduced by the new floor and bodywork package alter the flow structures reaching the rear corner region. To accommodate these changes and maximise the benefit of the update, the rear corner fairings have been re-optimised and the rear drum deflectors realigned, improving local flow management and overall aerodynamic efficiency.', magnitude: 'MEDIA', objective: 'Carga local', area: 'Suspensión' }),
  update('alpine-front-wing-endplate', { teamId: 'alpine', componentId: 'frontWing', presentedComponent: 'Front Wing Endplate', primaryReason: 'Performance - Local Load', geometricDifference: 'Revised footplate vane.', description: 'As part of our front wing development program, the vane has been redesigned to increase the local load and improve local flowfield.', magnitude: 'BAJA', objective: 'Carga local', area: 'Aerodinámica' }),
  update('alpine-rear-wing', { teamId: 'alpine', componentId: 'rearWing', presentedComponent: 'Rear Wing', primaryReason: 'Performance - Drag Reduction', geometricDifference: 'SM pod fairing removal.', description: 'The SM pod on the launch rear wing has been adjusted to better suit the low drag nature of the Monza track.', magnitude: 'BAJA', objective: 'Reducción de drag', area: 'Aerodinámica' }),
  update('cadillac-floor-board-stay', { teamId: 'cadillac', componentId: 'floor', presentedComponent: 'Forward Floor Board Stay', primaryReason: 'Performance - Flow Conditioning', geometricDifference: 'Updated stay position with higher outboard attachment point.', description: 'Revised forward floor board stay geometry which improves flow conditioning to the rear of the car, increases structural stability of the component and improves overall aerodynamic load at the rear of the car.', magnitude: 'MEDIA', objective: 'Acondicionamiento de flujo', area: 'Aerodinámica' }),
  update('cadillac-diffuser-vane', { teamId: 'cadillac', componentId: 'diffuser', presentedComponent: 'Diffuser Vane', primaryReason: 'Performance - Local Load', geometricDifference: 'Addition of vane to inner trailing edge of outboard diffuser sidewall.', description: 'A small vertical turning vane has been added to the inner trailing edge of the outboard diffuser sidewall, which improves aerodynamic performance in the outer floor channels and increases the load at the rear of the car.', magnitude: 'BAJA', objective: 'Carga local', area: 'Aerodinámica' }),
]

// English preserves the source wording. Spanish is a faithful translation of the
// corresponding presentation description, kept beside the canonical update record.
const spanishChangeTranslations: Record<string, string> = {
  'mclaren-rear-wing': 'Posición alternativa del flap en modo recta y beam wing menos cargado.',
  'mclaren-floor-furniture': 'Elementos auxiliares del piso actualizados.',
  'mercedes-rear-wing': 'Se retiraron varios dispositivos tipo winglet del alerón trasero.',
  'mercedes-front-bodywork': 'Soportes traseros de los espejos recortados.',
  'red-bull-rear-corner': 'Revisión del fuelle de carrocería de la suspensión trasera hacia la rueda.',
  'red-bull-floor': 'Perfil revisado del borde del bib.',
  'red-bull-tailpipe': 'Soporte revisado del tubo de escape.',
  'red-bull-front-wing': 'Vane revisado en el endplate.',
  'ferrari-floor-board': 'Optimización de los elementos delanteros de la tabla del piso, con un único elemento vertical.',
  'ferrari-mirror-stay': 'Soporte vertical del espejo más corto y nueva conexión al pontón.',
  'ferrari-rear-corner': 'Eliminación de la cascada de winglets del conducto de freno trasero.',
  'ferrari-rv-tail': 'Elemento central ranurado y winglets laterales recortados.',
  'williams-halo': 'Se introdujo una aleta vertical alrededor de la geometría del Halo.',
  'williams-front-wing': 'Reducción de la cuerda de los elementos del alerón delantero.',
  'williams-floor-body': 'Se aplicó un recorte local a la geometría de la tabla del piso.',
  'racing-bulls-rear-wing': 'Nuevo conjunto con mecanismo de modo recta actualizado.',
  'racing-bulls-tailpipe': 'Tubo de escape reposicionado con soporte rediseñado.',
  'aston-front-suspension': 'Carcasas revisadas para uno de los elementos de la suspensión delantera.',
  'aston-floor-edge': 'Actualización del área del piso delante del neumático trasero.',
  'haas-floor': 'Piso delantero nuevo: nueva geometría lateral y actualización del difusor.',
  'haas-bodywork': 'Nuevo pontón y coke line; roll-hoop más estrecho y cubierta del motor actualizada.',
  'haas-rear-corner': 'Carcasas de suspensión trasera y deflectores del tambor realineados.',
  'alpine-front-wing-endplate': 'Vane revisado en la placa de apoyo.',
  'alpine-rear-wing': 'Eliminación del carenado del pod de modo recta.',
  'cadillac-floor-board-stay': 'Posición del soporte actualizada con punto de anclaje exterior más alto.',
  'cadillac-diffuser-vane': 'Añadido un vane al borde de salida interior de la pared lateral exterior del difusor.',
}

// Presentation-only translations for the published Monza records. The canonical
// FIA source text remains untouched in public/data and is still available to the
// other product views and audit trail.
const spanishPublishedDescriptions: Record<string, string> = {
  'italian-grand-prix-2026-doc-10-mclaren-rear-wing-1': 'El alerón trasero modifica la posición del flap en modo recta y utiliza un beam wing con menos carga para lograr una mayor reducción de la resistencia aerodinámica.',
  'italian-grand-prix-2026-doc-10-mclaren-floor-2': 'Una pequeña modificación de los elementos auxiliares del piso mejora el acondicionamiento del flujo, el rendimiento aerodinámico del piso y la reducción de la resistencia.',
  'italian-grand-prix-2026-doc-10-mercedes-rear-wing-1': 'La retirada de varios winglets del alerón trasero reduce la carga local y la resistencia aerodinámica en una proporción adecuada para Monza.',
  'italian-grand-prix-2026-doc-10-red-bull-racing-floor-2': 'El perfil revisado del borde del bib modifica el flujo para generar más carga local y mejorar la estabilidad aerodinámica.',
  'italian-grand-prix-2026-doc-10-red-bull-racing-front-wing-4': 'El vane recortado del endplate del alerón delantero busca mejorar la carga generada aguas abajo por el piso.',
  'italian-grand-prix-2026-doc-10-ferrari-floor-1': 'La optimización de la tabla del piso adapta el auto a las características de Monza y reduce la resistencia aerodinámica con una relación favorable respecto de la pérdida de carga.',
  'italian-grand-prix-2026-doc-10-williams-halo-1': 'Una aleta vertical alrededor del Halo modifica la distribución de presión y el flujo aguas abajo para mejorar la eficiencia específica de Monza.',
  'italian-grand-prix-2026-doc-10-williams-front-wing-2': 'Se redujo la cuerda de los elementos del alerón delantero para adecuar el balance del auto a las exigencias de Monza.',
  'italian-grand-prix-2026-doc-10-williams-floor-3': 'Un recorte local en la tabla del piso modifica el equilibrio entre carga y resistencia aerodinámica en la parte delantera del piso principal.',
  'italian-grand-prix-2026-doc-10-racing-bulls-rear-wing-1': 'El nuevo conjunto del alerón trasero permite un mayor recorrido del flap en modo recta y una reducción eficiente de la resistencia aerodinámica.',
  'italian-grand-prix-2026-doc-10-aston-martin-front-suspension-1': 'El carenado exterior de un elemento de la suspensión delantera fue modificado para alinearse mejor con el flujo incidente.',
  'italian-grand-prix-2026-doc-10-aston-martin-floor-2': 'La geometría delante del neumático trasero mejora el flujo hacia la cara inferior del piso y aumenta la carga generada en esa zona.',
  'italian-grand-prix-2026-doc-10-haas-floor-1': 'El nuevo piso delantero optimiza la zona principal de expansión y la geometría lateral para mejorar la eficiencia, la carga y el rendimiento aerodinámico general.',
  'italian-grand-prix-2026-doc-10-alpine-front-wing-1': 'El vane del endplate fue rediseñado para aumentar la carga local y mejorar el campo de flujo de la zona.',
  'italian-grand-prix-2026-doc-10-alpine-rear-wing-2': 'Se retiró el carenado del pod de modo recta para adaptar el alerón trasero a la configuración de baja resistencia de Monza.',
  'italian-grand-prix-2026-doc-10-cadillac-floor-1': 'La nueva posición del soporte delantero de la tabla del piso mejora el flujo hacia la parte trasera, la estabilidad estructural y la carga aerodinámica posterior.',
  'italian-grand-prix-2026-doc-10-cadillac-diffuser-2': 'Un pequeño vane vertical en el borde interior de la pared lateral del difusor mejora el rendimiento de los canales exteriores del piso y aumenta la carga trasera.',
}

type GarageUpdateContent = Pick<GarageUpdate, 'presentedComponent' | 'primaryReason' | 'geometricDifference' | 'description'>

const spanishMadridUpdates: Record<string, GarageUpdateContent> = {
  'madrid-grand-prix-2026-doc-11-mclaren-rear-wing-1': {
    presentedComponent: 'Alerón trasero',
    primaryReason: 'Rendimiento – Acondicionamiento del flujo',
    geometricDifference: 'Elementos adicionales del alerón trasero',
    description: 'Se han añadido elementos adicionales al alerón trasero, mejorando el acondicionamiento del flujo hacia el plano principal y los elementos del flap del alerón trasero.',
  },
  'madrid-grand-prix-2026-doc-11-mercedes-rear-wing-1': {
    presentedComponent: 'Alerón trasero',
    primaryReason: 'Específico del circuito – Rango de resistencia aerodinámica',
    geometricDifference: 'Se redujo la envergadura del winglet central del alerón trasero',
    description: 'Reducir la envergadura del winglet central montado sobre el flap del alerón trasero disminuye la carga aerodinámica local y la resistencia en una proporción adecuada para la relación carga/resistencia de Madrid.',
  },
  'madrid-grand-prix-2026-doc-11-mercedes-exhaust-tailpipe-2': {
    presentedComponent: 'Tubo de escape',
    primaryReason: 'Específico del circuito – Rango de resistencia aerodinámica',
    geometricDifference: 'Winglet adicional detrás del escape',
    description: 'Se añadió un winglet para aumentar el giro del flujo del escape y generar carga y resistencia en una proporción adecuada para la relación carga/resistencia de Madrid.',
  },
  'madrid-grand-prix-2026-doc-11-mercedes-front-drum-3': {
    presentedComponent: 'Tambor delantero',
    primaryReason: 'Rendimiento – Acondicionamiento del flujo',
    geometricDifference: 'Labio delantero reperfilado',
    description: 'El labio delantero fue reperfilado para mejorar la adherencia del flujo en todas las condiciones de giro y, como resultado, mejorar el flujo hacia la parte trasera del auto.',
  },
  'madrid-grand-prix-2026-doc-11-red-bull-racing-rear-corner-1': {
    presentedComponent: 'Conjunto de esquina trasera',
    primaryReason: 'Fiabilidad',
    geometricDifference: 'Conjunto de carrocería de la rueda trasera',
    description: 'Continuando el trabajo de Monza, el nuevo fuelle más robusto incorpora winglets detrás de los carenados de suspensión para recuperar la carga de carreras anteriores manteniendo sellada la carrocería de la rueda.',
  },
  'madrid-grand-prix-2026-doc-11-red-bull-racing-floor-2': {
    presentedComponent: 'Bib del piso',
    primaryReason: 'Fiabilidad',
    geometricDifference: 'Cambio geométrico entre el piso y el chasis',
    description: 'Cuando se flexiona, se han modificado el laminado y la forma para eliminar idealmente el deterioro de la estructura y de las superficies aerodinámicas mediante la reducción de la deformación local.',
  },
  'madrid-grand-prix-2026-doc-11-ferrari-rear-suspension-1': {
    presentedComponent: 'Suspensión trasera',
    primaryReason: 'Rendimiento – Carga local',
    geometricDifference: 'Reperfilado del carenado del brazo trasero del triángulo superior trasero',
    description: 'Pequeña actualización del perfil del carenado de la suspensión trasera, adaptando la incidencia general y la distribución de carga a lo largo de la envergadura, lo que aporta un beneficio de carga local.',
  },
  'madrid-grand-prix-2026-doc-11-alpine-floor-1': {
    presentedComponent: 'Tabla del piso',
    primaryReason: 'Rendimiento – Carga local',
    geometricDifference: 'Adición de un elemento a la tabla delantera del piso',
    description: 'La tabla delantera del piso se ha optimizado para mejorar la distribución de presión local y la gestión del flujo, generando carga aerodinámica local de manera eficiente.',
  },
  'madrid-grand-prix-2026-doc-11-cadillac-rear-wing-1': {
    presentedComponent: 'Flap del alerón trasero',
    primaryReason: 'Rendimiento – Carga local',
    geometricDifference: 'Winglet actualizado en el borde de salida del flap del alerón trasero',
    description: 'La reintroducción de un winglet central revisado en el borde de salida del flap del alerón trasero sirve para generar más carga aerodinámica posterior, a la vez que mejora la estabilidad aerodinámica general en una variedad de condiciones de funcionamiento.',
  },
  'madrid-grand-prix-2026-doc-11-cadillac-diffuser-2': {
    presentedComponent: 'Vane del difusor',
    primaryReason: 'Rendimiento – Carga local',
    geometricDifference: 'Adición de un vane al borde de salida interior de la pared lateral exterior del difusor',
    description: 'Se ha añadido un pequeño vane vertical de giro al borde de salida interior de la pared lateral exterior del difusor, lo que mejora el rendimiento aerodinámico en los canales exteriores del piso y aumenta la carga en la parte trasera del auto.',
  },
}

export function getGarageUpdateContent(update: GarageUpdate, locale: GarageContentLocale): GarageUpdateContent {
  if (locale !== 'es') return {
    presentedComponent: update.presentedComponent,
    primaryReason: update.primaryReason,
    geometricDifference: update.geometricDifference,
    description: update.description,
  }
  const madridTranslation = spanishMadridUpdates[update.id]
  if (madridTranslation) return madridTranslation
  return {
    presentedComponent: update.presentedComponent,
    primaryReason: update.primaryReason,
    geometricDifference: spanishChangeTranslations[update.id] ?? update.geometricDifference,
    description: spanishPublishedDescriptions[update.id] ?? update.description,
  }
}

export const noUpdatesSubmitted = [{ teamId: 'audi', grandPrixId: monza }] as const
export const getGarageUpdates = (teamId: string, grandPrixId: string) => garageUpdates.filter((update) => update.teamId === teamId && update.grandPrixId === grandPrixId)
export const hasNoUpdatesSubmitted = (teamId: string, grandPrixId: string) => noUpdatesSubmitted.some((item) => item.teamId === teamId && item.grandPrixId === grandPrixId)

export const garageHotspots: F1TechHotspot[] = [
  { id: 'frontWing', componentId: 'frontWing', label: 'Alerón delantero', position: [0, .32, 2.72], calloutOffset: [0, .45, .55], inspectionView: { position: [3.2, 2.4, 5.8], target: [0, .38, 2.35], duration: 760 }, description: 'Aerodynamics' }, { id: 'nose', componentId: 'nose', label: 'Nariz', position: [0, .63, 1.85], calloutOffset: [.62, .38, .32], inspectionView: { position: [3, 2.25, 4.9], target: [0, .65, 1.7], duration: 740 }, description: 'Body' },
  { id: 'frontSuspension', componentId: 'frontSuspension', label: 'Suspensión delantera', position: [-.92, .46, 1.13], calloutOffset: [-.58, .43, .26], inspectionView: { position: [-3.5, 1.6, 3.8], target: [-.82, .48, 1.15], duration: 780 }, description: 'Mechanical' }, { id: 'frontBrake', componentId: 'frontBrake', label: 'Frenos delanteros', position: [1.2, .44, 1.23], calloutOffset: [.5, .4, .2], inspectionView: { position: [3.5, 1.4, 3], target: [1.08, .46, 1.2], duration: 760 }, description: 'Mechanical' },
  { id: 'wheels', componentId: 'wheels', label: 'Ruedas y neumáticos', position: [-1.28, .58, -1.43], calloutOffset: [-.5, .45, -.28], inspectionView: { position: [-3.7, 1.7, 1.8], target: [-1.18, .52, -1.1], duration: 780 }, description: 'Mechanical' }, { id: 'floor', componentId: 'floor', label: 'Piso', position: [-.85, .12, -.15], calloutOffset: [-.62, -.2, .28], inspectionView: { position: [3.2, -3.2, 3.6], target: [0, .12, -.2], duration: 940 }, description: 'Aerodynamics' },
  { id: 'sidepods', componentId: 'sidepods', label: 'Pontones', position: [1.06, .68, -.25], calloutOffset: [.72, .3, .16], inspectionView: { position: [4.2, 2.25, .5], target: [1, .7, -.12], duration: 760 }, description: 'Aerodynamics' }, { id: 'cooling', componentId: 'cooling', label: 'Refrigeración', position: [1.14, .72, -.38], calloutOffset: [.64, .42, -.08], inspectionView: { position: [4.15, 2, .1], target: [1.08, .75, -.38], duration: 760 }, description: 'Cooling' },
  { id: 'cockpit', componentId: 'chassis', label: 'Cockpit', position: [0, 1.02, .2], calloutOffset: [.55, .4, .18], inspectionView: { position: [3, 3.25, 3.35], target: [0, 1.08, .2], duration: 720 }, description: 'Body' }, { id: 'halo', componentId: 'halo', label: 'Halo', position: [-.4, 1.12, .2], calloutOffset: [-.56, .42, .12], inspectionView: { position: [-2.6, 3.45, 3.2], target: [-.2, 1.18, .15], duration: 720 }, description: 'Safety' },
  { id: 'engineCover', componentId: 'engineCover', label: 'Cubierta del motor', position: [0, 1.38, -.92], calloutOffset: [.58, .44, -.2], inspectionView: { position: [3, 3.1, -3.5], target: [0, 1.22, -.9], duration: 780 }, description: 'Body' }, { id: 'airbox', componentId: 'engineCover', label: 'Caja de aire', position: [0, 1.45, -.92], calloutOffset: [.28, .54, -.25], inspectionView: { position: [2.3, 4, -3], target: [0, 1.42, -.92], duration: 760 }, description: 'Cooling' },
  { id: 'rearSuspension', componentId: 'rearSuspension', label: 'Suspensión trasera', position: [-1.0, .58, -1.35], calloutOffset: [-.52, .42, -.18], inspectionView: { position: [-3.6, 2, -3.8], target: [-.9, .58, -1.35], duration: 800 }, description: 'Mechanical' }, { id: 'rearBrake', componentId: 'rearBrake', label: 'Frenos traseros', position: [1.26, .5, -1.43], calloutOffset: [.48, .38, -.16], inspectionView: { position: [3.6, 1.5, -3.2], target: [1.18, .5, -1.42], duration: 780 }, description: 'Mechanical' },
  { id: 'rearWing', componentId: 'rearWing', label: 'Alerón trasero', position: [0, 1.6, -2.18], calloutOffset: [0, .62, -.34], inspectionView: { position: [3, 2.6, -5.3], target: [0, 1.45, -2.1], duration: 860 }, description: 'Aerodynamics' }, { id: 'diffuser', componentId: 'diffuser', label: 'Difusor', position: [0, .15, -2.35], calloutOffset: [.5, .12, -.42], inspectionView: { position: [3, -1.2, -4.5], target: [0, .18, -2.1], duration: 860 }, description: 'Aerodynamics' },
]

export const garageComponentGroups = [
  { id: 'aerodynamics', componentIds: ['frontWing', 'nose', 'floor', 'diffuser', 'rearWing'] },
  { id: 'bodywork', componentIds: ['sidepods', 'cooling', 'engineCover', 'airbox'] },
  { id: 'chassis', componentIds: ['cockpit', 'halo', 'frontSuspension', 'rearSuspension'] },
  { id: 'wheelsBrakes', componentIds: ['wheels', 'frontBrake', 'rearBrake'] },
] as const
