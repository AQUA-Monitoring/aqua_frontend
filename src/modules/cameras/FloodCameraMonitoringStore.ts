import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import FloodCameraMonitoringApi from './FloodCameraMonitoringApi'
import type {
  CameraApiItem,
  CameraListFilters,
  CameraUpdatePayload,
  NeighborhoodDto,
} from './types/camera'
import { mergeCamerasWithPredictions } from './utils/cameraMapping'
import { parseApiError } from '@/shared'

export const useFloodCameraMonitoringStore = defineStore('flood_monitoring', () => {
  const camerasRaw = ref<CameraApiItem[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const count = ref(0)
  const next = ref<string | null>(null)
  const currentPage = ref(1)
  const activeFilters = ref<CameraListFilters>({})
  const showCameras = ref(true)
  const refreshing = ref(false)
  const lastCompletedAt = ref<number | null>(null)
  const camerasApi = new FloodCameraMonitoringApi()
  let requestSequence = 0
  let listController: AbortController | null = null
  const detailControllers = new Map<string, AbortController>()
  const detailCompletedAt = new Map<string, number>()

  const hasMore = computed(() => Boolean(next.value))
  const camerasWithPrediction = computed(() => mergeCamerasWithPredictions(camerasRaw.value, []))

  async function load(filters: CameraListFilters = {}): Promise<void> {
    const requestedFilters = { ...filters, page: 1 }
    if (
      camerasRaw.value.length &&
      lastCompletedAt.value &&
      Date.now() - lastCompletedAt.value < 300_000 &&
      JSON.stringify(requestedFilters) === JSON.stringify(activeFilters.value)
    ) {
      return
    }
    const sequence = ++requestSequence
    listController?.abort()
    listController = new AbortController()
    loadingMore.value = false
    refreshing.value = false
    loading.value = true
    error.value = null
    activeFilters.value = requestedFilters
    currentPage.value = 1
    try {
      const response = await camerasApi.getCameras(activeFilters.value, listController.signal)
      if (sequence !== requestSequence) return
      camerasRaw.value = response.results
      count.value = response.count
      next.value = response.next
      lastCompletedAt.value = Date.now()
    } catch (caught: unknown) {
      if (sequence !== requestSequence) return
      error.value = parseApiError(
        caught,
        'Não foi possível carregar as câmeras. Tente novamente em instantes.',
      ).message
      if (!camerasRaw.value.length) {
        count.value = 0
        next.value = null
      }
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (!next.value || loadingMore.value) return
    loadingMore.value = true
    const sequence = ++requestSequence
    listController?.abort()
    listController = new AbortController()
    loading.value = false
    refreshing.value = false
    error.value = null
    const page = currentPage.value + 1
    try {
      const response = await camerasApi.getCameras(
        { ...activeFilters.value, page },
        listController.signal,
      )
      if (sequence !== requestSequence) return
      const known = new Set(camerasRaw.value.map((camera) => camera.id))
      camerasRaw.value.push(...response.results.filter((camera) => !known.has(camera.id)))
      count.value = response.count
      next.value = response.next
      currentPage.value = page
      lastCompletedAt.value = Date.now()
    } catch (caught: unknown) {
      if (sequence !== requestSequence) return
      error.value = parseApiError(
        caught,
        'Não foi possível carregar mais câmeras. Tente novamente.',
      ).message
    } finally {
      if (sequence === requestSequence) loadingMore.value = false
    }
  }

  async function getById(id: string, force = false): Promise<CameraApiItem | null> {
    error.value = null
    const loaded = camerasRaw.value.find((camera) => camera.id === id) ?? null
    const detailAge = Date.now() - (detailCompletedAt.get(id) ?? 0)
    if (!force && loaded && detailAge < 60_000) return loaded
    const loadedIndex = camerasRaw.value.findIndex((camera) => camera.id === id)
    detailControllers.get(id)?.abort()
    const controller = new AbortController()
    detailControllers.set(id, controller)
    try {
      const camera = await camerasApi.getCamera(id, controller.signal)
      if (detailControllers.get(id) !== controller) return loaded
      if (loadedIndex >= 0) camerasRaw.value[loadedIndex] = camera
      else camerasRaw.value.push(camera)
      detailCompletedAt.set(id, Date.now())
      return camera
    } catch (caught) {
      if (!controller.signal.aborted) {
        error.value = parseApiError(caught).message
      }
      return loaded
    } finally {
      if (detailControllers.get(id) === controller) detailControllers.delete(id)
    }
  }

  async function refreshLoadedPages(): Promise<void> {
    if (refreshing.value) return
    const sequence = ++requestSequence
    listController?.abort()
    listController = new AbortController()
    loading.value = false
    loadingMore.value = false
    refreshing.value = true
    error.value = null
    try {
      const refreshed: CameraApiItem[] = []
      let latestCount = count.value
      let latestNext: string | null = null
      for (let page = 1; page <= currentPage.value; page += 1) {
        const response = await camerasApi.getCameras(
          { ...activeFilters.value, page },
          listController.signal,
        )
        refreshed.push(...response.results)
        latestCount = response.count
        latestNext = response.next
      }
      if (sequence !== requestSequence) return
      const known = new Set<string>()
      camerasRaw.value = refreshed.filter((camera) => {
        if (known.has(camera.id)) return false
        known.add(camera.id)
        return true
      })
      count.value = latestCount
      next.value = latestNext
      lastCompletedAt.value = Date.now()
    } catch (caught) {
      if (sequence === requestSequence) {
        error.value = parseApiError(
          caught,
          'Não foi possível atualizar os dados das câmeras.',
        ).message
      }
    } finally {
      if (sequence === requestSequence) refreshing.value = false
    }
  }

  async function update(id: string, payload: CameraUpdatePayload): Promise<CameraApiItem> {
    const camera = await camerasApi.updateCamera(id, payload)
    const index = camerasRaw.value.findIndex((item) => item.id === id)
    if (index >= 0) camerasRaw.value[index] = camera
    else camerasRaw.value.push(camera)
    return camera
  }

  async function remove(id: string, password: string): Promise<void> {
    await camerasApi.deleteCamera(id, password)
    ++requestSequence
    listController?.abort()
    detailControllers.get(id)?.abort()
    detailControllers.delete(id)
    detailCompletedAt.delete(id)
    camerasRaw.value = camerasRaw.value.filter((camera) => camera.id !== id)
    count.value = Math.max(0, count.value - 1)
    lastCompletedAt.value = null
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }

  async function getNeighborhoods(): Promise<NeighborhoodDto[]> {
    return camerasApi.getNeighborhoods()
  }

  function setShowCameras(value: boolean) {
    showCameras.value = value
  }

  return {
    camerasRaw,
    camerasWithPrediction,
    loading,
    loadingMore,
    error,
    count,
    hasMore,
    showCameras,
    refreshing,
    lastCompletedAt,
    load,
    loadMore,
    getById,
    refreshLoadedPages,
    update,
    remove,
    getNeighborhoods,
    setShowCameras,
  }
})
