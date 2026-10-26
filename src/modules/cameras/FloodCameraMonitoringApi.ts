import api from '@/app/plugins/axios'
import { formatTerritoryLabel } from '@/shared'
import type { Paginated } from '@/shared'
import type {
  CameraApiItem,
  AddressResolutionDto,
  CameraCreatePayload,
  CameraUpdatePayload,
  CameraListFilters,
  CityDto,
  NeighborhoodDto,
  NearbyCamerasResponse,
  AddressAutocompleteFilters,
  AddressAutocompleteSuggestion,
} from './types/camera'

interface RegionsNeighborhoodsResponse {
  regions?: Array<{
    id: string
    name: string
    neighborhoods?: Array<{
      id: string
      name: string
      city_id?: string | null
    }>
  }>
  neighborhoods?: NeighborhoodDto[]
}

interface AddressAutocompleteApiItem {
  id: string
  kind: 'street' | 'address'
  label: string
  name?: string
  city_id: string
  neighborhood_id?: string | null
  street_id?: string | null
  street?: string
  number?: string | null
  zipcode?: string | null
  location?: { type: 'Point'; coordinates: [number, number] } | null
}

function compactParams(filters: CameraListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
  )
}

function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.results) ? data.results : []
}

export default class FloodCameraMonitoringApi {
  async getCameras(
    filters: CameraListFilters = {},
    signal?: AbortSignal,
  ): Promise<Paginated<CameraApiItem>> {
    const { data } = await api.get<Paginated<CameraApiItem>>('/flood_monitoring/cameras/', {
      params: compactParams(filters),
      signal,
    })
    const results = Array.isArray(data?.results) ? data.results : []
    return {
      count: data?.count ?? results.length,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      ordering: data?.ordering ?? null,
      results,
    }
  }

  async getAllCameras(page = 1, signal?: AbortSignal): Promise<Paginated<CameraApiItem>> {
    return this.getCameras({ page }, signal)
  }

  async getCamera(id: string, signal?: AbortSignal): Promise<CameraApiItem> {
    const { data } = await api.get<CameraApiItem>(`/flood_monitoring/cameras/${id}/`, { signal })
    return data
  }

  async getNearbyCameras(id: string, radiusM = 5000, pageSize = 6): Promise<NearbyCamerasResponse> {
    const { data } = await api.get<NearbyCamerasResponse>(
      `/flood_monitoring/cameras/${id}/nearby/`,
      { params: { radius_m: radiusM, page_size: pageSize } },
    )
    return data
  }

  async createCamera(payload: CameraCreatePayload): Promise<CameraApiItem> {
    const { data } = await api.post<CameraApiItem>('/flood_monitoring/cameras/', payload)
    return data
  }

  async updateCamera(id: string, payload: CameraUpdatePayload): Promise<CameraApiItem> {
    const { data } = await api.patch<CameraApiItem>(`/flood_monitoring/cameras/${id}/`, payload)
    return data
  }

  async deleteCamera(id: string, password: string): Promise<void> {
    await api.delete(`/flood_monitoring/cameras/${id}/`, {
      data: { password },
    })
  }

  async getCities(): Promise<CityDto[]> {
    const { data } = await api.get<CityDto[] | Paginated<CityDto>>('/addressing/cities/')
    return unwrapList(data)
  }

  async getNeighborhoods(cityId?: string): Promise<NeighborhoodDto[]> {
    const { data } = await api.get<RegionsNeighborhoodsResponse>(
      '/addressing/regions-neighborhoods/',
      { params: cityId ? { city_id: cityId } : undefined },
    )
    if (Array.isArray(data.neighborhoods)) {
      return data.neighborhoods.map((neighborhood) => ({
        ...neighborhood,
        name: formatTerritoryLabel(neighborhood.name),
        region: neighborhood.region
          ? {
              ...neighborhood.region,
              name: formatTerritoryLabel(neighborhood.region.name),
            }
          : neighborhood.region,
      }))
    }
    return (data.regions ?? []).flatMap((region) =>
      (region.neighborhoods ?? []).map((neighborhood) => ({
        ...neighborhood,
        name: formatTerritoryLabel(neighborhood.name),
        region: { id: region.id, name: formatTerritoryLabel(region.name) },
      })),
    )
  }

  async resolveAddress(
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
  ): Promise<AddressResolutionDto> {
    const { data } = await api.get<AddressResolutionDto>('/addressing/resolve/', {
      params: { latitude, longitude },
      signal,
    })
    return {
      ...data,
      neighborhood: data.neighborhood
        ? {
            ...data.neighborhood,
            name: formatTerritoryLabel(data.neighborhood.name),
          }
        : null,
      region: data.region ? { ...data.region, name: formatTerritoryLabel(data.region.name) } : null,
      nearest_address: data.nearest_address
        ? {
            ...data.nearest_address,
            street: formatTerritoryLabel(data.nearest_address.street),
          }
        : null,
    }
  }

  async autocompleteAddress(
    filters: AddressAutocompleteFilters,
    signal?: AbortSignal,
  ): Promise<AddressAutocompleteSuggestion[]> {
    const { data } = await api.get<
      AddressAutocompleteApiItem[] | Paginated<AddressAutocompleteApiItem>
    >('/addressing/autocomplete/', { params: compactParams(filters), signal })
    return unwrapList(data).map((item): AddressAutocompleteSuggestion => {
      const isStreet = item.kind === 'street'
      return {
        id: item.id,
        kind: item.kind,
        label: formatTerritoryLabel(item.label),
        city_id: item.city_id,
        neighborhood_id: item.neighborhood_id ?? null,
        street_id: isStreet ? item.id : (item.street_id ?? null),
        address_reference_id: isStreet ? null : item.id,
        street: formatTerritoryLabel(
          isStreet ? (item.name ?? item.label) : (item.street ?? item.label),
        ),
        number: item.number ?? null,
        zipcode: item.zipcode ?? null,
        city: null,
        neighborhood: null,
        longitude: item.location?.coordinates[0] ?? null,
        latitude: item.location?.coordinates[1] ?? null,
      }
    })
  }
}
