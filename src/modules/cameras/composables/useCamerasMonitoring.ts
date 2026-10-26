import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useFloodCameraMonitoringStore } from '../FloodCameraMonitoringStore'
import type { CameraListFilters } from '../types/camera'

export function useCamerasMonitoring(
  options: { autoLoad?: boolean; autoRevalidate?: boolean } = {},
) {
  const store = useFloodCameraMonitoringStore()
  let catalogTimer: number | null = null

  const revalidate = () => {
    if (
      document.visibilityState === 'visible' &&
      navigator.onLine &&
      Date.now() - (store.lastCompletedAt ?? 0) > 30_000
    ) {
      void store.refreshLoadedPages()
    }
  }

  onMounted(async () => {
    if (options.autoLoad === false || store.camerasRaw.length) return
    await store.load()
  })

  onMounted(() => {
    if (options.autoRevalidate !== true) return
    catalogTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void store.refreshLoadedPages()
      }
    }, 300_000)
    window.addEventListener('focus', revalidate)
    window.addEventListener('online', revalidate)
    document.addEventListener('visibilitychange', revalidate)
  })
  onBeforeUnmount(() => {
    if (options.autoRevalidate !== true) return
    if (catalogTimer !== null) window.clearInterval(catalogTimer)
    window.removeEventListener('focus', revalidate)
    window.removeEventListener('online', revalidate)
    document.removeEventListener('visibilitychange', revalidate)
  })

  const statusCounters = computed(() => {
    let active = 0
    let inactive = 0
    let unavailable = 0
    for (const camera of store.camerasRaw) {
      if (camera.administrative_status === 'ACTIVE') active += 1
      else inactive += 1
      if (camera.operational.stream.status === 'UNAVAILABLE') unavailable += 1
    }
    return { active, inactive, unavailable }
  })

  const load = (filters?: CameraListFilters) => store.load(filters)

  return {
    cameras: computed(() => store.camerasRaw),
    camerasWithPrediction: computed(() => store.camerasWithPrediction),
    loading: computed(() => store.loading),
    loadingMore: computed(() => store.loadingMore),
    refreshing: computed(() => store.refreshing),
    lastCompletedAt: computed(() => store.lastCompletedAt),
    error: computed(() => store.error),
    count: computed(() => store.count),
    hasMore: computed(() => store.hasMore),
    load,
    loadMore: store.loadMore,
    refresh: store.refreshLoadedPages,
    getById: store.getById,
    update: store.update,
    remove: store.remove,
    getNeighborhoods: store.getNeighborhoods,
    statusCounters,
  }
}
