/** UI accents sampled from the currently authored GLBs. Never used to recolour 3D materials.
 * Render samples: 1920×1080 default view; median RGB of matching paint pixels,
 * excluding the darker half (cast shadows). See sampling metadata below.
 */
export const teamAccents: Readonly<Record<string, { color: string; source: string; sampling: string }>> = {
  'mercedes': { color: '#01C1B4', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Dominant turquoise texel RGB(1,193,180) in image 6 / MERCEDES_ANTONELLI_BODY; visually checked against nose and sidepod." },
  'ferrari': { color: '#AF0017', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Red painted body; render hue 0\u20130.035 or 0.97\u20131, saturation >0.55. Crop [450, 400, 1300, 830]; 11271 retained pixels." },
  'mclaren': { color: '#F66429', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Papaya painted body; render hue 0.025\u20130.10. Crop [450, 400, 1300, 830]; 12245 retained pixels." },
  'red-bull-racing': { color: '#0F1338', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Navy painted body, chosen over red/yellow sponsor accents; render hue 0.60\u20130.73. Crop [450, 400, 1300, 830]; 4644 retained pixels." },
  'racing-bulls': { color: '#081456', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Navy blue body/lettering over white, chosen over shared red/yellow bull graphics; render hue 0.60\u20130.73. Crop [450, 400, 1300, 830]; 2394 retained pixels." },
  'alpine': { color: '#CF7AA2', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Visible BWT pink paint, chosen over blue; render hue 0.85\u20130.95, saturation >0.35. Crop [450,400,1300,830]; 4884 retained pixels." },
  'haas': { color: '#D90B1D', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Red livery accents over white/carbon; render hue 0\u20130.035 or 0.97\u20131, saturation >0.55. Crop [450, 400, 1300, 830]; 5956 retained pixels." },
  'audi': { color: '#F25425', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Orange-red painted sidepod/engine-cover accents over silver; render hue 0.02\u20130.07. Crop [450, 400, 1300, 830]; 2096 retained pixels." },
  'williams': { color: '#002B98', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Blue painted body; render hue 0.57\u20130.70. Crop [450, 400, 1300, 830]; 11834 retained pixels." },
  'aston-martin': { color: '#0A383C', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Petroleum green painted body, chosen over lime detailing; render hue 0.44\u20130.55. Crop [450, 400, 1300, 830]; 8967 retained pixels." },
  'cadillac': { color: '#DEDEDE', source: "GLB baseColorTexture image 6 / MAIN_STICKERS_ALPINE", sampling: "Neutral white/silver body: no substantial non-neutral livery accent; excludes tyre lettering, cockpit labels and tiny badges. Median neutral cockpit/body pixels. Crop [1000, 490, 1110, 550]; 6086 retained pixels." },
}
