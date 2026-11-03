<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useTerritoryCatalog } from '@/modules/addressing'
import { CameraInspectionPanel, CameraOverviewCard } from '@/modules/cameras'
import { useCameraOverviewCatalog } from '@/modules/cameras'
import { useCameraOverviewPreferences } from '@/modules/cameras'
import { useCameraOverviewRoute } from '@/modules/cameras'
import { useCamerasMonitoring } from '@/modules/cameras'
import type { NeighborhoodDto } from '@/modules/cameras'
import { CatalogFilterPanel } from '@/shared'
import { localize, useI18n } from '@/app/i18n'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const isDesktop = useMediaQuery('(min-width: 1024px)')
const {
  cameras,
  loading,
  loadingMore,
  refreshing,
  lastCompletedAt,
  error,
  count,
  hasMore,
  load,
  loadMore,
  refresh,
  getById,
} = useCamerasMonitoring({ autoLoad: false, autoRevalidate: true })

const lastUpdatedLabel = computed(() =>
  lastCompletedAt.value
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(lastCompletedAt.value))
    : localize('Ainda não atualizado', 'Not updated yet'),
)

const territoryNeighborhoods = ref<NeighborhoodDto[]>([])
const territory = useTerritoryCatalog()
const normalizeTerritoryFilters = async (regionId: string, neighborhoodId: string) => {
  await territory.load()
  return territory.available.value
    ? territory.normalizePair(regionId, neighborhoodId)
    : { regionId, neighborhoodId }
}
const {
  cardMinWidth,
  automaticGrid,
  previewsPaused,
  density,
  cameraGridStyle,
  setCardMinWidth,
  setPreviewsPaused,
} = useCameraOverviewPreferences(route, router)
const {
  filtersOpen,
  filters,
  selectedCamera,
  mobileInspectionOpen,
  currentFilters,
  applyFilters,
  clearFilters,
  selectCamera,
  closeInspection,
} = useCameraOverviewRoute(route, router, load, getById, normalizeTerritoryFilters)
const { sortedCameras } = useCameraOverviewCatalog(cameras, territoryNeighborhoods)
const neighborhoodOptions = computed(() => territory.neighborhoodsFor(filters.region_id))
let selectedDetailCompletedAt = 0
let selectedDetailGeneration = 0
let selectedDetailTimer: number | null = null

const activeFilterCount = computed(
  () =>
    [
      filters.region_id,
      filters.neighborhood_id,
      filters.administrative_status === 'INACTIVE' ? filters.administrative_status : '',
      filters.stream_status,
      filters.analysis_status,
    ].filter(Boolean).length,
)

const workspaceColumns = computed(() => {
  if (selectedCamera.value) return 'lg:grid-cols-[minmax(320px,1fr)_minmax(360px,0.8fr)]'
  return 'lg:grid-cols-1'
})

async function refreshOverview() {
  const selectedId = selectedCamera.value?.id
  await refresh()
  if (selectedId && selectedCamera.value?.id === selectedId) {
    await refreshSelectedDetail()
  }
}

async function refreshSelectedDetail() {
  const selectedId = selectedCamera.value?.id
  if (
    !selectedId ||
    document.visibilityState !== 'visible' ||
    !navigator.onLine
  ) {
    return
  }
  const generation = ++selectedDetailGeneration
  const camera = await getById(selectedId, true)
  if (
    generation === selectedDetailGeneration &&
    selectedCamera.value?.id === selectedId &&
    camera
  ) {
    selectedCamera.value = camera
    selectedDetailCompletedAt = Date.now()
  }
}

const revalidateSelectedDetail = () => {
  if (Date.now() - selectedDetailCompletedAt > 30_000) {
    void refreshSelectedDetail()
  }
}

watch(
  () => selectedCamera.value?.id,
  (id) => {
    selectedDetailGeneration += 1
    selectedDetailCompletedAt = id ? Date.now() : 0
  },
)

watch(
  () => filters.region_id,
  () => {
    if (
      territory.available.value &&
      !territory.isValidPair(filters.region_id, filters.neighborhood_id)
    ) {
      filters.neighborhood_id = ''
    }
  },
)

onMounted(() => {
  selectedDetailTimer = window.setInterval(
    () => void refreshSelectedDetail(),
    60_000,
  )
  window.addEventListener('focus', revalidateSelectedDetail)
  window.addEventListener('online', revalidateSelectedDetail)
  document.addEventListener('visibilitychange', revalidateSelectedDetail)
})

onBeforeUnmount(() => {
  selectedDetailGeneration += 1
  if (selectedDetailTimer !== null) window.clearInterval(selectedDetailTimer)
  window.removeEventListener('focus', revalidateSelectedDetail)
  window.removeEventListener('online', revalidateSelectedDetail)
  document.removeEventListener('visibilitychange', revalidateSelectedDetail)
})
</script>

<template>
  <section class="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8 dark:text-white">
    <header class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="text-sm font-semibold tracking-[0.18em] text-[#2768CA] uppercase">
          {{ $l('Monitoramento por câmeras', 'Camera monitoring') }}
        </p>
        <h1 class="mt-1 text-3xl font-semibold sm:text-4xl">{{ $l('Visão geral das câmeras', 'Camera overview') }}</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
          {{ $l('Priorize a inspeção por estado operacional e por indícios da análise automática. O resultado não confirma uma ocorrência.', 'Prioritize inspection by operational status and automated analysis signals. The result does not confirm an incident.') }}
        </p>
      </div>
      <div class="flex items-center gap-5">
        <img
          src="/gifs/camera.gif"
          alt=""
          aria-hidden="true"
          class="hidden h-20 w-20 object-contain xl:block"
        />
        <p v-if="!error" class="text-sm text-slate-500 dark:text-slate-400">
          <strong class="text-slate-800 dark:text-white">{{ count }}</strong>
          {{ count === 1 ? $l('câmera encontrada', 'camera found') : $l('câmeras encontradas', 'cameras found') }}
        </p>
      </div>
    </header>

    <CatalogFilterPanel
      v-model:open="filtersOpen"
      class="mt-6"
      :active-count="activeFilterCount"
      filters-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      @apply="applyFilters"
      @clear="clearFilters"
    >
      <template #search>
        <label class="relative flex-1">
          <span class="sr-only">{{ $l('Buscar câmera ou endereço', 'Search camera or address') }}</span>
          <span
            class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
            >search</span
          >
          <input
            v-model="filters.search"
            type="search"
            class="min-h-12 w-full rounded-2xl border border-slate-300 bg-transparent pr-4 pl-11 outline-none focus:border-[#2768CA] focus:ring-3 focus:ring-[#2768CA]/15 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-400"
            :placeholder="$l('Buscar câmera, rua ou bairro', 'Search camera, street, or neighborhood')"
          />
        </label>
      </template>
        <label class="grid gap-1 text-xs font-semibold"
          >{{ $l('Região', 'Region') }}
          <select
            v-model="filters.region_id"
            :disabled="territory.loading.value || !territory.available.value"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
          >
            <option value="">{{ $l('Todas', 'All') }}</option>
            <option v-for="item in territory.regions.value" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-semibold"
          >{{ $l('Bairro', 'Neighborhood') }}
          <select
            v-model="filters.neighborhood_id"
            :disabled="territory.loading.value || !territory.available.value"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
          >
            <option value="">{{ $l('Todos', 'All') }}</option>
            <option v-for="item in neighborhoodOptions" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-semibold"
          >{{ $l('Estado administrativo', 'Administrative status') }}
          <select
            v-model="filters.administrative_status"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
          >
            <option value="">{{ $l('Todos', 'All') }}</option>
            <option value="ACTIVE">{{ $l('Ativa', 'Active') }}</option>
            <option value="INACTIVE">{{ $l('Inativa', 'Inactive') }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-semibold"
          >{{ $l('Transmissão', 'Stream') }}
          <select
            v-model="filters.stream_status"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
          >
            <option value="">{{ $l('Todas', 'All') }}</option>
            <option value="UNKNOWN">{{ $l('Não verificada', 'Not checked') }}</option>
            <option value="CHECKING">{{ $l('Verificando', 'Checking') }}</option>
            <option value="ONLINE">{{ $l('Disponível', 'Available') }}</option>
            <option value="UNAVAILABLE">{{ $l('Indisponível', 'Unavailable') }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-semibold"
          >{{ $l('Análise', 'Analysis') }}
          <select
            v-model="filters.analysis_status"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
          >
            <option value="">{{ $l('Todas', 'All') }}</option>
            <option value="NOT_ANALYZED">{{ $l('Não analisada', 'Not analyzed') }}</option>
            <option value="RUNNING">{{ $l('Em andamento', 'In progress') }}</option>
            <option value="AVAILABLE">{{ $l('Disponível', 'Available') }}</option>
            <option value="STALE">{{ $l('Desatualizada', 'Outdated') }}</option>
            <option value="NO_FRAME">{{ $l('Sem imagem', 'No image') }}</option>
            <option value="MODEL_UNAVAILABLE">{{ $l('Modelo indisponível', 'Model unavailable') }}</option>
            <option value="ERROR">{{ $l('Erro', 'Error') }}</option>
          </select>
        </label>
        <p
          v-if="territory.error.value"
          class="text-xs text-amber-700 sm:col-span-2 xl:col-span-5 dark:text-amber-300"
          role="status"
        >
          {{ territory.error.value }} {{ $l('Os demais filtros continuam disponíveis.', 'The other filters remain available.') }}
        </p>
    </CatalogFilterPanel>

    <div class="mt-4 hidden justify-end lg:flex">
      <div class="flex items-center mr-2 gap-2">
        <button type="button"
          class="min-h-11 rounded-xl border border-[#2768CA] px-4 text-sm font-semibold text-[#2768CA] disabled:opacity-60"
          :disabled="refreshing" @click="refreshOverview">
          {{ refreshing ? $l('Atualizando...', 'Updating...') : $l('Atualizar dados', 'Refresh data') }}
        </button>

        <p class="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {{ $l('Última atualização:', 'Last updated:') }} {{ lastUpdatedLabel }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          class="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600"
          :aria-pressed="previewsPaused"
          @click="setPreviewsPaused(!previewsPaused)"
        >
          {{ previewsPaused ? $l('Retomar prévias', 'Resume previews') : $l('Pausar prévias', 'Pause previews') }}
        </button>
        <div
          class="flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-[#00182F]"
          role="group"
          aria-label="Disposição da grade de câmeras"
        >
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            :class="
              automaticGrid
                ? 'border-[#2768CA] bg-[#2768CA] text-white shadow-md'
                : 'border-transparent text-slate-600 hover:border-[#2768CA]/40 hover:bg-[#2768CA]/10 hover:text-[#2768CA] dark:text-slate-300'
            "
            aria-label="Grade automática"
            :aria-pressed="automaticGrid"
            title="Grade automática"
            @click="setCardMinWidth(320, true)"
          >
            <svg
              aria-hidden="true"
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            >
              <rect x="5" y="5" width="5.5" height="5.5" rx="0.8" />
              <rect x="13.5" y="5" width="5.5" height="5.5" rx="0.8" />
              <rect x="5" y="13.5" width="5.5" height="5.5" rx="0.8" />
              <path d="M14 16h5m-2.2-2.2L19 16l-2.2 2.2" />
              <path d="M16 14v5" />
            </svg>
          </button>
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            :class="
              !automaticGrid && cardMinWidth === 320
                ? 'border-[#2768CA] bg-[#2768CA] text-white shadow-md'
                : 'border-transparent text-slate-600 hover:border-[#2768CA]/40 hover:bg-[#2768CA]/10 hover:text-[#2768CA] dark:text-slate-300'
            "
            aria-label="Grade compacta, mais câmeras por linha"
            :aria-pressed="!automaticGrid && cardMinWidth === 320"
            title="Grade compacta"
            @click="setCardMinWidth(320)"
          >
            <svg aria-hidden="true" class="size-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="5" height="5" rx="0.8" />
              <rect x="9.5" y="3" width="5" height="5" rx="0.8" />
              <rect x="16" y="3" width="5" height="5" rx="0.8" />
              <rect x="3" y="9.5" width="5" height="5" rx="0.8" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
              <rect x="16" y="9.5" width="5" height="5" rx="0.8" />
              <rect x="3" y="16" width="5" height="5" rx="0.8" />
              <rect x="9.5" y="16" width="5" height="5" rx="0.8" />
              <rect x="16" y="16" width="5" height="5" rx="0.8" />
            </svg>
          </button>
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            :class="
              !automaticGrid && cardMinWidth === 360
                ? 'border-[#2768CA] bg-[#2768CA] text-white shadow-md'
                : 'border-transparent text-slate-600 hover:border-[#2768CA]/40 hover:bg-[#2768CA]/10 hover:text-[#2768CA] dark:text-slate-300'
            "
            aria-label="Grade confortável, cartões médios"
            :aria-pressed="!automaticGrid && cardMinWidth === 360"
            title="Grade confortável"
            @click="setCardMinWidth(360)"
          >
            <svg aria-hidden="true" class="size-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="4" width="8" height="7" rx="1" />
              <rect x="13" y="4" width="8" height="7" rx="1" />
              <rect x="3" y="13" width="8" height="7" rx="1" />
              <rect x="13" y="13" width="8" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            :class="
              !automaticGrid && cardMinWidth === 400
                ? 'border-[#2768CA] bg-[#2768CA] text-white shadow-md'
                : 'border-transparent text-slate-600 hover:border-[#2768CA]/40 hover:bg-[#2768CA]/10 hover:text-[#2768CA] dark:text-slate-300'
            "
            aria-label="Grade ampla, cartões grandes"
            :aria-pressed="!automaticGrid && cardMinWidth === 400"
            title="Grade ampla"
            @click="setCardMinWidth(400)"
          >
            <svg aria-hidden="true" class="size-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="5" width="18" height="14" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      role="alert"
      class="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="min-h-11 font-semibold underline"
        @click="load(currentFilters())"
      >
        {{ $l('Tentar novamente', 'Try again') }}
      </button>
    </div>

    <div class="mt-5 grid gap-5" :class="workspaceColumns">
      <div>
        <div
          v-if="loading"
          class="grid gap-3 lg:gap-4"
          :style="cameraGridStyle"
          :aria-label="$l('Carregando câmeras', 'Loading cameras')"
        >
          <div
            v-for="item in 5"
            :key="item"
            class="h-48 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800"
          ></div>
        </div>
        <div
          v-else-if="!sortedCameras.length && !error"
          class="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600"
        >
          <span class="material-symbols-outlined text-5xl text-slate-400" aria-hidden="true"
            >videocam_off</span
          >
          <h2 class="mt-3 text-lg font-semibold">{{ $l('Nenhuma câmera encontrada', 'No cameras found') }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ $l('Ajuste a busca ou limpe os filtros para ampliar a consulta.', 'Change your search or clear the filters to broaden the results.') }}
          </p>
        </div>
        <div
          v-else
          class="grid gap-3 lg:gap-4"
          :style="cameraGridStyle"
          :aria-label="$l('Grade de câmeras', 'Camera grid')"
          :data-density="density"
        >
          <CameraOverviewCard
            v-for="camera in sortedCameras"
            :key="camera.id"
            :camera="camera"
            :selected="selectedCamera?.id === camera.id"
            :density="density"
            :previews-paused="previewsPaused"
            @select="selectCamera"
          />
          <button
            v-if="hasMore"
            type="button"
            class="min-h-12 rounded-2xl border border-[#2768CA] px-4 font-semibold text-[#2768CA] disabled:opacity-60 sm:col-span-full"
            :disabled="loadingMore"
            @click="loadMore"
          >
            {{ loadingMore ? $l('Carregando...', 'Loading...') : $l('Carregar mais', 'Load more') }}
          </button>
        </div>
      </div>

      <template v-if="selectedCamera">
        <button
          v-if="mobileInspectionOpen"
          type="button"
          class="fixed inset-0 z-[60] bg-[#00182F]/55 lg:hidden"
          :aria-label="$l('Fechar inspeção', 'Close inspection')"
          @click="closeInspection"
        ></button>
        <CameraInspectionPanel
          v-if="mobileInspectionOpen || isDesktop"
          :camera="selectedCamera"
          @close="closeInspection"
        />
      </template>
    </div>
  </section>
</template>
