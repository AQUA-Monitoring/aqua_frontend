import { formatLocale } from '@/app/i18n'
import type {
  FloodPointApiItem,
  FloodPointNeighborhood,
  FloodPointNeighborhoodDto,
  FloodPointUiItem,
} from './types/floodPoints'

const finiteNumberOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const normalizeNeighborhood = (
  item: FloodPointNeighborhoodDto | null | undefined,
): FloodPointNeighborhood | null => {
  if (!item?.name?.trim()) return null

  return {
    id: item.id,
    name: item.name.trim(),
    cityId: item.city_id,
    relation: item.relation ?? null,
    isPrimary: item.is_primary,
    intersectionAreaM2: finiteNumberOrNull(item.intersection_area_m2),
    footprintFraction: finiteNumberOrNull(item.footprint_fraction),
    resolutionMethod: item.resolution_method || null,
    reviewStatus: item.review_status ?? null,
    region: item.region
      ? {
          id: String(item.region.id),
          name: item.region.name,
        }
      : null,
  }
}

const legacyNeighborhood = (item: FloodPointApiItem): FloodPointNeighborhood => ({
  id: String(item.neighborhood ?? ''),
  name: item.neighborhood_name?.trim() || String(item.neighborhood ?? ''),
  cityId: String(item.city ?? ''),
  relation: null,
  isPrimary: true,
  intersectionAreaM2: null,
  footprintFraction: null,
  resolutionMethod: null,
  reviewStatus: null,
  region: null,
})

const neighborhoodKey = (item: FloodPointNeighborhood): string =>
  item.id || item.name.toLocaleLowerCase('pt-BR')

export const formatFloodPointNeighborhoodSummary = (
  primaryName: string,
  neighborhoods: ReadonlyArray<Pick<FloodPointNeighborhood, 'name'>>,
): string => {
  const normalizedPrimaryName = primaryName.toLocaleLowerCase('pt-BR')
  const additionalCount = neighborhoods.filter(
    (item) => item.name.toLocaleLowerCase('pt-BR') !== normalizedPrimaryName,
  ).length

  if (!additionalCount) return primaryName
  return `${primaryName} + ${additionalCount} ${additionalCount === 1 ? 'bairro' : 'bairros'}`
}

export const formatNeighborhoodProportion = (fraction: number | null): string | null => {
  if (fraction === null || fraction < 0) return null
  const percentage = fraction <= 1 ? fraction * 100 : fraction
  return new Intl.NumberFormat(formatLocale(), { maximumFractionDigits: 1 }).format(percentage) + '%'
}

export const adaptFloodPoint = (
  item: FloodPointApiItem,
  probability: number,
  duration: number,
): FloodPointUiItem => {
  const legacyPrimary = legacyNeighborhood(item)
  const normalizedPrimary = normalizeNeighborhood(item.primary_neighborhood)
  const primary = normalizedPrimary
    ? {
        ...normalizedPrimary,
        name: item.primary_neighborhood?.name?.trim() || legacyPrimary.name,
      }
    : legacyPrimary
  const normalized = (Array.isArray(item.neighborhoods) ? item.neighborhoods : [])
    .map(normalizeNeighborhood)
    .filter((entry): entry is FloodPointNeighborhood => entry !== null)
  const byKey = new Map<string, FloodPointNeighborhood>()

  const primaryKey = neighborhoodKey(primary)
  byKey.set(primaryKey, primary)
  for (const neighborhood of normalized) {
    const key = neighborhoodKey(neighborhood)
    byKey.set(key, key === primaryKey ? { ...neighborhood, name: primary.name } : neighborhood)
  }
  const neighborhoods = [...byKey.values()]
  const primaryNeighborhood = byKey.get(primaryKey) ?? primary

  return {
    id: String(item.id),
    city: item.city_name,
    neighborhood: primary.name,
    neighborhoodSummary: formatFloodPointNeighborhoodSummary(primary.name, neighborhoods),
    primaryNeighborhood,
    neighborhoods,
    referenceBaseRevision: item.reference_base_revision ?? null,
    probability,
    createdAt: item.created_at,
    finishedAt: item.finished_at,
    duration,
  }
}
