<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import HlsPlayer from './hlsPlayer.vue'
import CameraStatusBadge from './CameraStatusBadge.vue'
import FloodCameraMonitoringApi from '../FloodCameraMonitoringApi'
import { parseApiError } from '@/shared'
import type { CameraApiItem } from '../types/camera'
import { cameraAddressLabel, formatCameraDate } from '../utils/cameraPresentation'
import { isPriorityCamera } from '../utils/priorityCameras'

const props = defineProps<{
  cameras: CameraApiItem[]
  selectedCameraId: string | null
  loading?: boolean
  error?: string | null
  contextCount?: number | null
}>()
const emit = defineEmits<{
  'update:selectedCameraId': [id: string]
  showAll: []
  inspect: [camera: CameraApiItem]
}>()
const api = new FloodCameraMonitoringApi()
const detail = ref<CameraApiItem | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
let selectionRequest = 0
let detailController: AbortController | null = null
let detailCompletedAt = 0
let detailTimer: number | null = null
const currentIndex = computed(() => {
  const index = props.cameras.findIndex((camera) => camera.id === props.selectedCameraId)
  return index >= 0 ? index : 0
})
const selected = computed(() => props.cameras[currentIndex.value] ?? null)
const presented = computed(() => detail.value ?? selected.value)

async function loadSelectedDetail(camera: CameraApiItem | null, reset = false) {
    const request = ++selectionRequest
    detailController?.abort()
    detailController = null
    if (reset) {
      detail.value = null
      detailError.value = null
    }
    if (!camera) {
      detailLoading.value = false
      return
    }
    detailLoading.value = true
    detailController = new AbortController()
    try {
      const result = await api.getCamera(camera.id, detailController.signal)
      if (request !== selectionRequest) return
      detail.value = result
      detailError.value = null
      detailCompletedAt = Date.now()
    } catch (reason) {
      if (request !== selectionRequest) return
      detailError.value = parseApiError(
        reason,
        'Não foi possível carregar os detalhes desta câmera.',
      ).message
    }
    if (request === selectionRequest) detailLoading.value = false
}

watch(
  selected,
  (camera) => void loadSelectedDetail(camera, true),
  { immediate: true },
)

const revalidateDetail = () => {
  if (
    selected.value &&
    document.visibilityState === 'visible' &&
    navigator.onLine &&
    Date.now() - detailCompletedAt > 30_000
  ) {
    void loadSelectedDetail(selected.value)
  }
}

onMounted(() => {
  detailTimer = window.setInterval(() => {
    if (
      selected.value &&
      document.visibilityState === 'visible' &&
      navigator.onLine
    ) {
      void loadSelectedDetail(selected.value)
    }
  }, 60_000)
  window.addEventListener('focus', revalidateDetail)
  window.addEventListener('online', revalidateDetail)
  document.addEventListener('visibilitychange', revalidateDetail)
})

onBeforeUnmount(() => {
  selectionRequest += 1
  detailController?.abort()
  detailController = null
  if (detailTimer !== null) window.clearInterval(detailTimer)
  window.removeEventListener('focus', revalidateDetail)
  window.removeEventListener('online', revalidateDetail)
  document.removeEventListener('visibilitychange', revalidateDetail)
})

function move(offset: number) {
  if (!props.cameras.length) return
  const index = (currentIndex.value + offset + props.cameras.length) % props.cameras.length
  const camera = props.cameras[index]
  if (camera) emit('update:selectedCameraId', camera.id)
}

</script>

<template>
  <section aria-labelledby="priority-camera-title">
    <div class="flex items-center justify-between gap-3 md:mb-3 md:pb-1">
      <div>
        <p
          class="hidden text-xs font-semibold tracking-[0.02em] text-[#2768CA] uppercase md:block"
        >
        </p>
        <h3 id="priority-camera-title" class="sr-only text-lg font-semibold md:not-sr-only">
          Câmeras prioritárias
        </h3>
      </div>
      <span class="material-symbols-outlined hidden text-[#2768CA] md:block" aria-hidden="true">
        videocam
      </span>
    </div>
    <div
      v-if="props.loading"
      class="flex items-start gap-3 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-blue-900 shadow-sm dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100"
      role="status"
    >
      <span class="material-symbols-outlined mt-0.5 shrink-0 animate-spin" aria-hidden="true">
        progress_activity
      </span>
      <div>
        <p class="font-semibold">Carregando câmera prioritária</p>
        <p class="mt-1 text-sm text-blue-800 dark:text-blue-200">
          Aguarde enquanto o monitoramento é preparado.
        </p>
      </div>
    </div>
    <div
      v-else-if="props.error"
      class="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm dark:border-red-900 dark:bg-red-950/60 dark:text-red-100"
      role="alert"
    >
      <span class="material-symbols-outlined mt-0.5 shrink-0" aria-hidden="true">
        error
      </span>
      <div>
        <p class="font-semibold">Não foi possível carregar as câmeras</p>
        <p class="mt-1 text-sm text-red-800 dark:text-red-200">{{ props.error }}</p>
      </div>
    </div>
    <article
      v-else-if="selected"
      class="grid grid-cols-[7.75rem_minmax(0,1fr)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[10rem_minmax(0,1fr)] md:block dark:border-slate-700 dark:bg-[#001C3B]"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="min-h-36 bg-[#00182F] md:aspect-video md:min-h-0">
        <div
          v-if="detailLoading && !detail"
          class="grid h-full place-items-center border-b border-slate-700 bg-slate-950 px-4 text-center text-white md:border-b-0"
          role="status"
        >
          <div>
            <span
              class="material-symbols-outlined animate-spin text-3xl text-[#7AA6C8]"
              aria-hidden="true"
            >
              progress_activity
            </span>
            <p class="mt-2 text-sm font-semibold">Carregando transmissão</p>
            <p class="mt-1 hidden text-xs text-slate-300 sm:block">Buscando a fonte da câmera.</p>
          </div>
        </div>
        <div
          v-else-if="detailError && !detail"
          class="grid h-full place-items-center border-b border-red-900 bg-red-950 px-4 text-center text-red-100 md:border-b-0"
          role="alert"
        >
          <div>
            <span class="material-symbols-outlined text-3xl" aria-hidden="true">error</span>
            <p class="mt-2 text-sm font-semibold">Detalhes indisponíveis</p>
            <p class="mt-1 hidden text-xs text-red-200 sm:block">{{ detailError }}</p>
          </div>
        </div>
        <HlsPlayer
          v-else-if="presented?.video_hls"
          :key="presented.id"
          :src="presented.video_hls"
          muted
          controls
          autoplay
          lock-to-live
          :live-delay="18"
        />
        <div
          v-else
          class="grid h-full place-items-center border-b border-slate-700 bg-slate-950 px-4 text-center text-white md:border-b-0"
          role="status"
        >
          <div>
            <span class="material-symbols-outlined text-3xl text-slate-400" aria-hidden="true">
              videocam_off
            </span>
            <p class="mt-2 text-sm font-semibold">Transmissão indisponível</p>
            <p class="mt-1 hidden text-xs text-slate-300 sm:block">
              Esta câmera não possui uma fonte disponível para reprodução.
            </p>
          </div>
        </div>
      </div>
      <div class="flex min-w-0 flex-col p-3 md:p-4">
        <div
          v-if="contextCount"
          class="mb-3 flex items-center justify-between gap-2"
        >
          <span
            class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
          >
            {{ contextCount }}
            {{ contextCount === 1 ? 'câmera na área' : 'câmeras na área' }}
          </span>
          <button
            type="button"
            class="min-h-9 rounded-lg px-2 text-xs font-semibold text-[#2768CA] transition hover:bg-blue-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] dark:hover:bg-blue-950/60"
            @click="emit('showAll')"
          >
            Ver todas
          </button>
        </div>
        <div class="flex items-start justify-between gap-2 md:gap-3">
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-[#2768CA] hover:bg-blue-50 hover:text-[#2768CA] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] dark:border-slate-700 dark:text-slate-200 dark:hover:border-[#2768CA] dark:hover:bg-blue-950/60"
            aria-label="Câmera anterior"
            @click="move(-1)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <div class="min-w-0 flex-1 text-left md:text-center">
            <p class="line-clamp-2 text-sm font-semibold md:text-base">
              {{ presented?.description }}
            </p>
            <p class="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
              <span class="material-symbols-outlined mr-0.5 align-middle text-sm" aria-hidden="true">
                location_on
              </span>
              {{ presented ? cameraAddressLabel(presented) : '' }}
            </p>
          </div>
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-[#2768CA] hover:bg-blue-50 hover:text-[#2768CA] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] dark:border-slate-700 dark:text-slate-200 dark:hover:border-[#2768CA] dark:hover:bg-blue-950/60"
            aria-label="Próxima câmera"
            @click="move(1)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div v-if="presented" class="min-w-0 max-w-full">
            <CameraStatusBadge :camera="presented" />
          </div>
          <p v-if="presented && isPriorityCamera(presented)"
            class="ml-auto shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
            <span class="block">Última análise</span>
            <span class="font-medium text-slate-700 dark:text-slate-200">
              {{ formatCameraDate(presented.operational.analysis.analyzed_at) }}
            </span>
          </p>
        </div>
        <div
          class="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-end md:justify-between dark:border-slate-800">
          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2768CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F57AD] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] md:w-auto"
            @click="presented && emit('inspect', presented)"
          >
            Inspecionar câmera
          </button>
        </div>
      </div>
    </article>
    <div
      v-else
      class="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[#071F36] dark:text-slate-200"
      role="status"
    >
      <span class="material-symbols-outlined mt-0.5 shrink-0 text-slate-500" aria-hidden="true">
        videocam_off
      </span>
      <div>
        <p class="font-semibold">Nenhuma câmera disponível</p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Não há câmeras prioritárias para monitoramento neste contexto.
        </p>
      </div>
    </div>
  </section>
</template>
