import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type {
  CameraAdministrativeStatus,
  CameraAnalysisStatus,
  CameraApiItem,
  CameraListFilters,
  CameraStreamStatus,
  CameraUpdatePayload,
} from '../types/camera'
import { useCamerasMonitoring } from './useCamerasMonitoring'

function queryText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function guardedQuerySignature(query: RouteLocationNormalizedLoaded['query']) {
  return JSON.stringify({
    search: queryText(query.search),
    region_id: queryText(query.region_id),
    neighborhood_id: queryText(query.neighborhood_id),
    administrative_status: queryText(query.administrative_status),
    stream_status: queryText(query.stream_status),
    analysis_status: queryText(query.analysis_status),
    camera: queryText(query.camera),
  })
}

export function useCameraManagementWorkspace(
  route: RouteLocationNormalizedLoaded,
  router: Router,
  normalizeTerritoryFilters?: (
    regionId: string,
    neighborhoodId: string,
  ) => Promise<{ regionId: string; neighborhoodId: string }>,
) {
  const monitoring = useCamerasMonitoring({ autoLoad: false })
  const filters = reactive({
    search: '',
    region_id: '',
    neighborhood_id: '',
    administrative_status: '' as CameraAdministrativeStatus | '',
    stream_status: '' as CameraStreamStatus | '',
    analysis_status: '' as CameraAnalysisStatus | '',
  })
  const filtersOpen = ref(false)
  const appliedFilters = ref<CameraListFilters>({})
  const selected = ref<CameraApiItem | null>(null)
  const selectedLoading = ref(false)
  const selectedError = ref<string | null>(null)
  const saving = ref(false)
  const dirty = ref(false)
  const discardDialogOpen = ref(false)
  let pendingAction: (() => void | Promise<void>) | null = null
  let selectionSequence = 0
  let routeSyncSequence = 0
  let lastFilterSignature = ''

  function currentFilters(): CameraListFilters {
    return {
      search: filters.search.trim() || undefined,
      region_id: filters.region_id || undefined,
      neighborhood_id: filters.neighborhood_id || undefined,
      administrative_status: filters.administrative_status || undefined,
      stream_status: filters.stream_status || undefined,
      analysis_status: filters.analysis_status || undefined,
    }
  }

  function buildQuery(
    extra: Record<string, string | undefined> = {},
    active: CameraListFilters = appliedFilters.value,
  ) {
    return {
      ...(active.search ? { search: active.search } : {}),
      ...(active.region_id ? { region_id: active.region_id } : {}),
      ...(active.neighborhood_id ? { neighborhood_id: active.neighborhood_id } : {}),
      ...(active.administrative_status
        ? { administrative_status: active.administrative_status }
        : { administrative_status: 'all' }),
      ...(active.stream_status ? { stream_status: active.stream_status } : {}),
      ...(active.analysis_status ? { analysis_status: active.analysis_status } : {}),
      ...(selected.value ? { camera: selected.value.id } : {}),
      ...extra,
    }
  }

  function runGuarded(action: () => void | Promise<void>) {
    if (!dirty.value) {
      void action()
      return
    }
    pendingAction = action
    discardDialogOpen.value = true
  }

  async function confirmDiscard() {
    const action = pendingAction
    pendingAction = null
    discardDialogOpen.value = false
    dirty.value = false
    if (action) await action()
  }

  function cancelDiscard() {
    pendingAction = null
    discardDialogOpen.value = false
  }

  async function loadSelected(id: string) {
    const sequence = ++selectionSequence
    selectedLoading.value = true
    selectedError.value = null
    const camera = await monitoring.getById(id, true)
    if (sequence !== selectionSequence) return
    const hasAdministrativeDetail =
      camera !== null && Object.prototype.hasOwnProperty.call(camera, 'video_hls')
    selected.value = hasAdministrativeDetail ? camera : null
    selectedLoading.value = false
    if (!hasAdministrativeDetail) {
      selectedError.value = 'Não foi possível carregar os detalhes administrativos da câmera.'
    }
  }

  async function syncFromRoute() {
    const routeSequence = ++routeSyncSequence
    filters.search = queryText(route.query.search)
    filters.region_id = queryText(route.query.region_id)
    filters.neighborhood_id = queryText(route.query.neighborhood_id)
    if (normalizeTerritoryFilters) {
      const normalized = await normalizeTerritoryFilters(filters.region_id, filters.neighborhood_id)
      if (routeSequence !== routeSyncSequence) return
      filters.region_id = normalized.regionId
      filters.neighborhood_id = normalized.neighborhoodId
    }
    const administrativeStatus = queryText(route.query.administrative_status)
    filters.administrative_status =
      administrativeStatus === 'ACTIVE' || administrativeStatus === 'INACTIVE'
        ? administrativeStatus
        : ''
    filters.stream_status = queryText(route.query.stream_status) as CameraStreamStatus | ''
    filters.analysis_status = queryText(route.query.analysis_status) as CameraAnalysisStatus | ''
    const signature = JSON.stringify(currentFilters())
    appliedFilters.value = currentFilters()
    if (signature !== lastFilterSignature) {
      lastFilterSignature = signature
      await monitoring.load(appliedFilters.value)
      if (routeSequence !== routeSyncSequence) return
    }

    const selectedId = queryText(route.query.camera)
    if (!selectedId) {
      ++selectionSequence
      selected.value = null
      selectedLoading.value = false
      selectedError.value = null
      dirty.value = false
      return
    }
    if (selected.value?.id !== selectedId) await loadSelected(selectedId)
  }

  function applyFilters() {
    runGuarded(async () => {
      selected.value = null
      await router.replace({
        query: buildQuery({ camera: undefined }, currentFilters()),
      })
    })
    filtersOpen.value = false
  }

  function clearFilters() {
    filters.search = ''
    filters.region_id = ''
    filters.neighborhood_id = ''
    filters.administrative_status = ''
    filters.stream_status = ''
    filters.analysis_status = ''
    applyFilters()
  }

  function selectCamera(camera: CameraApiItem) {
    if (selected.value?.id === camera.id) return
    runGuarded(async () => {
      await router.replace({ query: buildQuery({ camera: camera.id }) })
    })
  }

  function closeEditor() {
    runGuarded(async () => {
      await router.replace({ query: buildQuery({ camera: undefined }) })
    })
  }

  function refresh() {
    runGuarded(async () => {
      await monitoring.load(appliedFilters.value)
      const selectedId = queryText(route.query.camera)
      if (selectedId) await loadSelected(selectedId)
    })
  }

  async function save(payload: CameraUpdatePayload) {
    if (!selected.value) return
    saving.value = true
    selectedError.value = null
    try {
      const updated = await monitoring.update(selected.value.id, payload)
      selected.value = updated
      dirty.value = false
      await monitoring.load(appliedFilters.value)
      return updated
    } finally {
      saving.value = false
    }
  }

  async function remove(password: string) {
    if (!selected.value || saving.value) return
    saving.value = true
    try {
      await monitoring.remove(selected.value.id, password)
      ++selectionSequence
      selected.value = null
      dirty.value = false
      await router.replace({ query: buildQuery({ camera: undefined }) })
      await monitoring.load(appliedFilters.value)
    } finally {
      saving.value = false
    }
  }

  function setDirty(value: boolean) {
    dirty.value = value
  }

  function confirmNativeDiscard() {
    return !dirty.value || window.confirm('Há alterações não salvas. Deseja descartá-las?')
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
  onBeforeRouteLeave(confirmNativeDiscard)
  onBeforeRouteUpdate((to, from) => {
    if (to.fullPath === route.fullPath) return true
    if (guardedQuerySignature(to.query) === guardedQuerySignature(from.query)) return true
    return confirmNativeDiscard()
  })
  watch(() => route.fullPath, syncFromRoute, { immediate: true })

  return {
    ...monitoring,
    filters,
    filtersOpen,
    selected,
    selectedLoading,
    selectedError,
    saving,
    dirty: computed(() => dirty.value),
    discardDialogOpen,
    currentFilters,
    applyFilters,
    clearFilters,
    selectCamera,
    closeEditor,
    refresh,
    save,
    remove,
    setDirty,
    runGuarded,
    confirmDiscard,
    cancelDiscard,
  }
}
