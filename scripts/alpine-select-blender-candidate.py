# Blender: Scripting > Open > Run Script. No modifica geometria ni materiales.
import bpy

CANDIDATES = {
  "nose": [
    "GEO_MAIN_BODY_1_362",
    "GEO_MAIN_BODY_1B_363",
    "GEO_CB1_1_344"
  ],
  "floor": [
    "GEO_CB1_1_344",
    "GEO_CB1_3_346",
    "GEO_GEN_2_354"
  ],
  "diffuser": [
    "GEO_CB1_1_344",
    "GEO_CB1_3_346",
    "GEO_GEN_1_353"
  ],
  "sidepods": [
    "GEO_MAIN_BODY_2_364",
    "GEO_CB1_2_345",
    "GEO_CB2_2_348",
    "GEO_MAIN_STICKERS_368"
  ],
  "engineCover": [
    "GEO_MAIN_BODY_2_364",
    "GEO_CB1_2_345",
    "GEO_EXT_1_350",
    "GEO_MAIN_STICKERS_368"
  ],
  "airbox": [
    "GEO_MAIN_BODY_2_364",
    "GEO_CB2_2_348",
    "GEO_CB1_2_345"
  ],
  "frontBrake": [
    "GEO_CB1_HUB_LF_381",
    "GEO_CB1_HUB_RF_399",
    "GEO_SUSP_SKINNED_SUB1_497"
  ],
  "rearBrake": [
    "GEO_CB1_HUB_LR_391",
    "GEO_CB1_HUB_RR_409",
    "GEO_SUSP_SKINNED_SUB1_497"
  ],
  "frontDrum": [
    "GEO_CB1_HUB_LF_381",
    "GEO_CB1_HUB_RF_399"
  ],
  "rearDrum": [
    "GEO_CB1_HUB_LR_391",
    "GEO_CB1_HUB_RR_409"
  ],
  "beamWing": [
    "GEO_MAIN_REARWING_453",
    "GEO_CB1_RW_SKINNED_495",
    "GEO_CB1_RW_455"
  ],
  "coolingLouvres": [
    "GEO_EXT_VENTS_1A_410",
    "GEO_MAIN_VENTS_1A_411",
    "GEO_EXT_VENTS_1B_412",
    "GEO_MAIN_VENTS_1B_413"
  ],
  "onboardCamera": [
    "GEO_CB1_4_347",
    "GEO_MAIN_BODY_4_367",
    "GEO_EXT_4_351"
  ],
  "steeringWheel": [
    "GEO_SW_ME_A_219",
    "GEO_SW_ME_B_220",
    "LR_GEO_SW_ME_A_315",
    "LR_GEO_SW_ME_B_316"
  ]
}

def list_candidates():
    for category, names in CANDIDATES.items():
        print(category)
        for i, name in enumerate(names):
            print(f'  {i}: {name}')

def select_candidate(category, index=0):
    name = CANDIDATES[category][index]
    matches = [obj for obj in bpy.context.scene.objects
               if obj.type == 'MESH' and (obj.name == name or obj.data.name == name)]
    if len(matches) != 1:
        raise RuntimeError(f'{name}: {len(matches)} coincidencias. Abrir el GLB auditado y comprobar nombres exactos en Outliner.')
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    obj = matches[0]
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    print(f'{category}[{index}] = {obj.name}; datos = {obj.data.name}. Usar Numpad . para encuadrar; Tab y L sobre una region para identificar una isla.')
    return obj

bpy.app.driver_namespace["select_alpine_candidate"] = select_candidate
list_candidates()
# En consola: bpy.app.driver_namespace['select_alpine_candidate']('nose', 0)
# Si la consola no conserva estas funciones, cambiar la linea siguiente y ejecutar:
# select_candidate('nose', 0)
