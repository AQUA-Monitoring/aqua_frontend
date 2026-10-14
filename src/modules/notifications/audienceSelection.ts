import type { TerritoryCatalogOption } from '@/modules/addressing'

export interface AudienceSelection {
  regionIds: string[]
  neighborhoodIds: string[]
}

export function toggleAudienceTerritory(
  selection: AudienceSelection,
  neighborhoods: readonly TerritoryCatalogOption[],
  kind: 'region' | 'neighborhood',
  id: string,
): AudienceSelection {
  const regionIds = new Set(selection.regionIds)
  const neighborhoodIds = new Set(selection.neighborhoodIds)
  if (kind === 'region') {
    const removing = regionIds.has(id)
    if (removing) regionIds.delete(id)
    else regionIds.add(id)
    neighborhoods
      .filter((item) => item.regionId === id)
      .forEach((item) => {
        if (removing) neighborhoodIds.delete(item.id)
        else neighborhoodIds.add(item.id)
      })
  } else if (neighborhoodIds.has(id)) {
    neighborhoodIds.delete(id)
    const parent = neighborhoods.find((item) => item.id === id)?.regionId
    if (parent) regionIds.delete(parent)
  } else neighborhoodIds.add(id)
  return { regionIds: [...regionIds], neighborhoodIds: [...neighborhoodIds] }
}
