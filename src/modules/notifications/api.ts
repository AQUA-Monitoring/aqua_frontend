import api from '@/app/plugins/axios'
import type {
  OperationalAlert,
  OperationalAlertFilters,
  OperationalAlertsPage,
  PushConfig,
  RegionSubscription,
  SavedPlace,
  NotificationEvent,
} from './types'

export class NotificationsApi {
  async listAlerts(filters: OperationalAlertFilters = {}) {
    const { data } = await api.get<OperationalAlertsPage>('/operational-alerts/', {
      params: filters,
    })
    return data
  }

  async confirm(id: string, reason = '') {
    const { data } = await api.post<OperationalAlert>(`/operational-alerts/${id}/confirm/`, {
      reason,
    })
    return data
  }

  async dismiss(id: string, reason = '') {
    const { data } = await api.post<OperationalAlert>(`/operational-alerts/${id}/dismiss/`, {
      reason,
    })
    return data
  }

  async resolve(id: string, notifySubscribers: boolean, reason = '') {
    const { data } = await api.post<OperationalAlert>(`/operational-alerts/${id}/resolve/`, {
      notify_subscribers: notifySubscribers,
      reason,
    })
    return data
  }

  async listRegionSubscriptions() {
    const { data } = await api.get<{ results: RegionSubscription[] }>('/region-subscriptions/')
    return data.results
  }

  async followRegion(regionId: string) {
    const { data } = await api.post<RegionSubscription>('/region-subscriptions/', {
      region_id: regionId,
    })
    return data
  }

  async unfollowRegion(regionId: string) {
    await api.delete('/region-subscriptions/', { params: { region_id: regionId } })
  }

  async followNeighborhood(neighborhoodId: string) {
    const { data } = await api.post<RegionSubscription>('/region-subscriptions/', { neighborhood_id: neighborhoodId })
    return data
  }

  async unfollowNeighborhood(neighborhoodId: string) {
    await api.delete('/region-subscriptions/', { params: { neighborhood_id: neighborhoodId } })
  }

  async listSavedPlaces() {
    const { data } = await api.get<{ results: SavedPlace[] }>('/saved-places/')
    return data.results
  }

  async createSavedPlace(payload: Omit<SavedPlace, 'id' | 'territory'>) {
    const { data } = await api.post<SavedPlace>('/saved-places/', payload)
    return data
  }

  async updateSavedPlace(id: string, payload: Partial<Omit<SavedPlace, 'id' | 'territory'>>) {
    const { data } = await api.patch<SavedPlace>(`/saved-places/${id}/`, payload)
    return data
  }

  async deleteSavedPlace(id: string) {
    await api.delete(`/saved-places/${id}/`)
  }

  async listEvents(params: Record<string, string> = {}) {
    const { data } = await api.get<{ results: NotificationEvent[] }>('/notification-events/', { params })
    return data.results
  }

  async createManualEvent(payload: { title: string; message: string; severity: string; is_global: boolean; region_ids: string[]; neighborhood_ids: string[] }) {
    const { data } = await api.post<NotificationEvent>('/notification-events/', payload)
    return data
  }

  async previewEvent(id: string) {
    const { data } = await api.get<{ users: number; devices: number }>(`/notification-events/${id}/preview/`)
    return data
  }

  async publishEvent(id: string) {
    const { data } = await api.post<NotificationEvent>(`/notification-events/${id}/publish/`)
    return data
  }

  async cancelEvent(id: string) {
    const { data } = await api.post<NotificationEvent>(`/notification-events/${id}/cancel/`)
    return data
  }

  async getPushConfig() {
    const { data } = await api.get<PushConfig>('/push-subscriptions/config/')
    return data
  }

  async registerPush(subscription: PushSubscriptionJSON) {
    await api.post('/push-subscriptions/', subscription)
  }

  async removePush(endpoint: string) {
    await api.delete('/push-subscriptions/', { data: { endpoint } })
  }
}

export const notificationsApi = new NotificationsApi()
