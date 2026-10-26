import api from '@/app/plugins/axios'
import type {
  CreateFloodPointPayload,
  FloodPointApiItem,
  FloodPointsApiResponse,
} from '../types/floodPoints'

export default class FloodPointsApi {
  async getFloodPoints(page = 1): Promise<FloodPointsApiResponse> {
    const { data } = await api.get<FloodPointsApiResponse>('/floods_point/registering/', {
      params: { page },
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

  async updateFloodPoint(
    id: string | number,
    payload: { password: string; notify: boolean; finished_at: string },
  ): Promise<FloodPointApiItem> {
    const { data } = await api.patch<FloodPointApiItem>(`/floods_point/registering/${id}/`, payload)
    return data
  }

  async endFloodPoint(
    id: string | number,
    payload: { password: string; notify: boolean },
  ): Promise<void> {
    await api.delete(`/floods_point/registering/${id}/`, { data: payload })
  }

  async createFloodPoint(payload: CreateFloodPointPayload): Promise<FloodPointApiItem> {
    // Build the supported body explicitly so queued drafts created by older versions
    // cannot reintroduce custom idempotency fields or headers that trigger CORS.
    const body: CreateFloodPointPayload = {
      city: payload.city,
      neighborhood: payload.neighborhood,
      possibility: payload.possibility,
      duration: payload.duration,
      finished_at: payload.finished_at,
      props: payload.props,
      location: payload.location ?? null,
      footprint: payload.footprint ?? null,
      ...(payload.reference_base_revision
        ? { reference_base_revision: payload.reference_base_revision }
        : {}),
    }
    const { data } = await api.post<FloodPointApiItem>('/floods_point/registering/', body)
    return data
  }

  async getFloodMachineLearningForecastPoints(page = 1): Promise<FloodPointsApiResponse> {
    const { data } = await api.get<FloodPointsApiResponse>('/forecast/foresee/', {
      params: { page },
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
}
