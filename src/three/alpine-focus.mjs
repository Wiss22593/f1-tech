import { resolveInspectionComponent } from './component-mapping.mjs'
export const alpineAssetId = 'alpine-a526-formulatech-evaluation'
// World coordinates include the authored 1.1 viewer scale. Unsupported pieces have no camera.
export const alpineInspectionViews = {
  "frontWing": {
    "position": [
      2.6,
      2.1,
      5.2
    ],
    "target": [
      0,
      0.24,
      2.72
    ],
    "duration": 760
  },
  "rearWing": {
    "position": [
      2.5,
      2.2,
      -5.2
    ],
    "target": [
      0,
      0.94,
      -2.35
    ],
    "duration": 800
  },
  "frontSuspension": {
    "position": [
      -2.7,
      3.1,
      4.4
    ],
    "target": [
      0,
      0.49,
      1.76
    ],
    "duration": 780
  },
  "rearSuspension": {
    "position": [
      -1.5,
      4.8,
      -4.2
    ],
    "target": [
      0,
      0.48,
      -1.75
    ],
    "duration": 800
  },
  "cooling": {
    "position": [
      3.4,
      1.7,
      0.6
    ],
    "target": [
      0,
      0.225,
      -0.58
    ],
    "duration": 780
  },
  "chassis": {
    "position": [
      2.4,
      3,
      3
    ],
    "target": [
      0,
      0.55,
      0.65
    ],
    "duration": 720
  },
  "halo": {
    "position": [
      -2.5,
      3,
      3
    ],
    "target": [
      0,
      0.9,
      0.4
    ],
    "duration": 720
  },
  "mirrors": {
    "position": [
      2.7,
      2.3,
      3.4
    ],
    "target": [
      0,
      0.8,
      0.72
    ],
    "duration": 720
  },
  "wheels": {
    "position": [
      4,
      2.5,
      4.5
    ],
    "target": [
      0,
      0.39,
      0
    ],
    "duration": 780
  },
  "frontWheels": {
    "position": [
      3.2,
      2.5,
      4.3
    ],
    "target": [
      0,
      0.39,
      1.87
    ],
    "duration": 780
  },
  "rearWheels": {
    "position": [
      3.2,
      2.5,
      -4.3
    ],
    "target": [
      0,
      0.39,
      -1.87
    ],
    "duration": 780
  },
  "frontCorner": {
    "position": [
      -2.7,
      3.1,
      4.4
    ],
    "target": [
      0,
      0.49,
      1.76
    ],
    "duration": 780
  },
  "rearCorner": {
    "position": [
      -1.5,
      4.8,
      -4.2
    ],
    "target": [
      0,
      0.48,
      -1.75
    ],
    "duration": 800
  }
}
/** One gate for camera and materials; FIA text remains independent. */
export function resolveAlpineFocus(componentId, sourceName, available) {
 const component = resolveInspectionComponent(componentId, sourceName)
 return component && available.includes(component) && alpineInspectionViews[component] ? component : undefined
}
