<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import CameraInspectionPanel from './CameraInspectionPanel.vue'
import HlsPlayer from './hlsPlayer.vue'
import { usePriorityCameras } from '../composables/usePriorityCameras'
import type { CameraApiItem, NearbyCameraItem } from '../types/camera'
import { rankPriorityCameras } from '../utils/priorityCameras'
import { cameraPresentation, formatCameraDate, formatNullablePercent } from '../utils/cameraPresentation'

const props = defineProps<{
  cameras?: CameraApiItem[]
  loading?: boolean
  error?: string | null
}>()
const {
  cameras: internalCameras,
  loading: internalLoading,
  error: internalError,
  loadDetail,
} = usePriorityCameras({
  autoLoad: props.cameras === undefined,
  autoRevalidate: props.cameras === undefined,
})
const cameras = computed(() => props.cameras ?? internalCameras.value)
const loading = computed(() => props.loading ?? internalLoading.value)
const error = computed(() => props.error ?? internalError.value)
const prioritySlots = computed(() => {
  const ranked = rankPriorityCameras(cameras.value).slice(0, 4)
  return [...ranked, ...Array<null>(Math.max(0, 4 - ranked.length)).fill(null)]
})
const selected = ref<CameraApiItem | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const dialogElement = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let detailRequest = 0

async function inspect(camera: CameraApiItem) {
  if (!dialogElement.value) {
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  const request = ++detailRequest
  selected.value = null
  detailError.value = null
  detailLoading.value = true
  await nextTick()
  dialogElement.value?.focus()
  const result = await loadDetail(camera)
  if (request !== detailRequest || !result) return
  selected.value = result.camera
  detailError.value = result.error
  detailLoading.value = false
}

async function closeInspection() {
  detailRequest += 1
  selected.value = null
  detailError.value = null
  detailLoading.value = false
  await nextTick()
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
  previouslyFocused = null
}

function selectNearby(camera: NearbyCameraItem) {
  void inspect(camera)
}

function probabilityBadgeClass(camera: CameraApiItem) {
  const tone = cameraPresentation(camera).tone
  if (tone === 'risk') return 'bg-red-700/90 text-white'
  if (tone === 'attention') return 'bg-amber-400/95 text-slate-950'
  if (tone === 'safe') return 'bg-emerald-700/90 text-white'
  return 'bg-slate-700/90 text-white'
}

function focusableElements() {
  return Array.from(
    dialogElement.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.hasAttribute('hidden'))
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    void closeInspection()
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    dialogElement.value?.focus()
    return
  }
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) return
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogElement.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <section class="priority-cameras grid min-w-0 w-full gap-3" aria-labelledby="admin-priority-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 id="admin-priority-title" class="text-xl font-bold">Câmeras prioritárias</h3>
      <RouterLink to="/cameras" class="text-sm font-semibold text-[#2768CA]">Ver todas</RouterLink>
    </div>
    <p v-if="loading" class="text-sm text-slate-500" role="status">Carregando câmeras...</p>
    <p v-else-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
    <div v-else class="priority-grid grid gap-4">
      <article
        v-for="(camera, index) in prioritySlots"
        :key="camera?.id ?? `empty-${index}`"
        class="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-[#2768CA] dark:border-slate-700 dark:bg-[#001C3B]"
      >
        <template v-if="camera">
          <div class="relative aspect-video bg-[#00182F]">
            <HlsPlayer
              v-if="camera.preview_url"
              class="absolute! inset-0"
              :src="camera.preview_url"
              autoplay
              muted
              controls
              :lock-to-live="true"
            />
            <div v-else class="grid h-full place-items-center text-xs text-white">
              Prévia indisponível
            </div>
            <span
              class="absolute top-2 right-2 rounded-full px-2 py-1 text-xs font-semibold"
              :class="probabilityBadgeClass(camera)"
              :aria-label="`Probabilidade de alagado: ${formatNullablePercent(camera.operational.analysis.probabilities.flooded)}`"
            >
              {{ formatNullablePercent(camera.operational.analysis.probabilities.flooded) }}
            </span>
          </div>
          <div class="flex flex-1 flex-col p-4">
            <div class="flex items-start justify-between gap-2">
              <p class="line-clamp-2 text-sm font-semibold">{{ camera.description }}</p>
              <span class="material-symbols-outlined text-[#2768CA]" aria-hidden="true">videocam</span>
            </div>
            <p class="mt-3 text-xs font-semibold">{{ cameraPresentation(camera).label }}</p>
            <p class="mt-1 mb-3 text-xs text-slate-600 dark:text-slate-300">
              {{ formatCameraDate(camera.operational.analysis.analyzed_at) }}
            </p>
            <button
              type="button"
              class="mt-auto min-h-11 w-full rounded-xl bg-[#2768CA] px-4 text-sm font-semibold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
              @click="inspect(camera)"
            >
              Inspecionar
            </button>
          </div>
        </template>
        <div v-else class="grid min-h-64 place-items-center bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-[#071F36]">
          Sem outra câmera prioritária
        </div>
      </article>
    </div>

    <div
      v-if="detailLoading || detailError || selected"
      ref="dialogElement"
      class="fixed inset-0 z-[80] bg-[#00182F]/55 lg:grid lg:grid-cols-[1fr_minmax(420px,620px)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-camera-dialog-title"
      tabindex="-1"
      @click.self="closeInspection"
      @keydown="handleDialogKeydown"
    >
      <div class="hidden lg:block" aria-hidden="true" @click="closeInspection"></div>
      <aside class="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto lg:static lg:col-start-2 lg:max-h-dvh lg:bg-white lg:p-5 dark:lg:bg-[#00182F]">
        <h2 id="admin-camera-dialog-title" class="sr-only">Inspeção de câmera prioritária</h2>
        <div
          v-if="detailLoading"
          class="grid min-h-64 place-items-center rounded-t-3xl bg-white p-6 text-center dark:bg-[#001C3B]"
          role="status"
        >
          Carregando detalhes da câmera...
        </div>
        <div
          v-else-if="detailError"
          class="rounded-t-3xl bg-white p-6 text-center dark:bg-[#001C3B]"
          role="alert"
        >
          <p>{{ detailError }}</p>
          <button type="button" class="mt-4 min-h-11 rounded-xl bg-[#2768CA] px-5 font-semibold text-white" @click="closeInspection">
            Fechar
          </button>
        </div>
        <CameraInspectionPanel
          v-else-if="selected"
          :camera="selected"
          nearby-layout="below"
          :local-nearby-selection="true"
          :external-focus-management="true"
          @close="closeInspection"
          @select-nearby="selectNearby"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.priority-cameras {
  container-type: inline-size;
}
@container (min-width: 28rem) {
  .priority-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (min-width: 64rem) {
  .priority-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
