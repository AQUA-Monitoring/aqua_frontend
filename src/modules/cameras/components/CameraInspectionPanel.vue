<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { RouterLink, useRouter } from 'vue-router'
import HlsPlayer from './hlsPlayer.vue'
import CameraAnalysisDetails from './CameraAnalysisDetails.vue'
import CameraStatusBadge from './CameraStatusBadge.vue'
import NearbyCameraDock from './NearbyCameraDock.vue'
import FloodCameraMonitoringApi from '../FloodCameraMonitoringApi'
import type { CameraApiItem, NearbyCameraItem } from '../types/camera'
import { parseApiError } from '@/shared'
import {
  cameraAddressLabel,
  cameraPresentation,
  formatCameraDate,
} from '../utils/cameraPresentation'

const props = withDefaults(
  defineProps<{
    camera: CameraApiItem
    nearbyLayout?: 'below' | 'side'
    localNearbySelection?: boolean
    externalFocusManagement?: boolean
  }>(),
  {
    nearbyLayout: 'below',
    localNearbySelection: false,
    externalFocusManagement: false,
  },
)
const emit = defineEmits<{ close: []; selectNearby: [camera: NearbyCameraItem] }>()
const router = useRouter()
const cameraApi = new FloodCameraMonitoringApi()
const playing = ref(false)
const nearbyCameras = ref<NearbyCameraItem[]>([])
const nearbyLoading = ref(false)
const nearbyError = ref<string | null>(null)
const panelElement = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const isDesktop = useMediaQuery('(min-width: 1024px)')
let previouslyFocused: HTMLElement | null = null
const presentation = computed(() => cameraPresentation(props.camera))
const canAutoPlay = computed(
  () => props.camera.status !== 'INACTIVE' && Boolean(props.camera.video_hls),
)
const canPlay = computed(() => canAutoPlay.value)

watch(
  () => [props.camera.id, props.camera.video_hls] as const,
  () => {
    playing.value = canAutoPlay.value
  },
  { immediate: true },
)

let nearbyRequest = 0
async function loadNearbyCameras(cameraId: string) {
  const request = ++nearbyRequest
  nearbyLoading.value = true
  nearbyError.value = null
  try {
    const response = await cameraApi.getNearbyCameras(cameraId)
    if (request === nearbyRequest) nearbyCameras.value = response.results
  } catch (error) {
    if (request === nearbyRequest) {
      nearbyCameras.value = []
      nearbyError.value = parseApiError(
        error,
        'Não foi possível consultar as câmeras próximas.',
      ).message
    }
  } finally {
    if (request === nearbyRequest) nearbyLoading.value = false
  }
}

watch(
  () => props.camera.id,
  (cameraId) => {
    void loadNearbyCameras(cameraId)
  },
  { immediate: true },
)

function openNearbyCamera(item: NearbyCameraItem) {
  if (props.localNearbySelection) {
    emit('selectNearby', item)
    return
  }
  router.push(`/cameras/${item.id}`)
}

function togglePlayback() {
  if (playing.value) {
    playing.value = false
    return
  }
  if (canPlay.value) playing.value = true
}

function focusableElements() {
  return Array.from(
    panelElement.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.hasAttribute('hidden'))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (isDesktop.value || event.key !== 'Tab') return

  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    panelElement.value?.focus()
    return
  }
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  if (props.externalFocusManagement) return
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', handleKeydown)
  if (!isDesktop.value) {
    await nextTick()
    closeButton.value?.focus()
  }
})

onBeforeUnmount(() => {
  if (props.externalFocusManagement) return
  document.removeEventListener('keydown', handleKeydown)
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
})
</script>

<template>
  <section
    ref="panelElement"
    class="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-4xl border border-slate-200 bg-white p-4 pr-1 shadow-2xl lg:sticky lg:top-5 lg:z-40 lg:max-h-[calc(100dvh-2.5rem)] lg:rounded-3xl dark:border-slate-700 dark:bg-[#001C3B]"
    :role="props.externalFocusManagement || isDesktop ? 'region' : 'dialog'"
    :aria-modal="props.externalFocusManagement || isDesktop ? undefined : true"
    aria-labelledby="camera-inspection-title"
    tabindex="-1"
  >
    <div class="aqua-scrollbar min-h-0 overflow-y-auto p-2">
    <div
      class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden dark:bg-slate-600"
    ></div>
    <div
      :class="
        props.nearbyLayout === 'side'
          ? 'lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)] lg:gap-6'
          : ''
      "
    >
      <div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold tracking-[0.14em] text-[#2768CA] uppercase">
              Câmera selecionada
            </p>
            <h2 id="camera-inspection-title" class="mt-1 text-xl font-semibold">
              {{ camera.description }}
            </h2>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-[#2768CA] dark:hover:bg-slate-800"
            aria-label="Fechar inspeção"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {{ cameraAddressLabel(camera) }}
        </p>
        <div class="mt-4">
          <CameraStatusBadge :camera="camera" />
        </div>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {{ presentation.description }}
        </p>

        <div class="mt-5 overflow-hidden rounded-2xl bg-[#00182F]">
          <div v-if="playing" class="aspect-video">
            <HlsPlayer
              :key="camera.id"
              :src="camera.video_hls ?? ''"
              :muted="true"
              :controls="true"
              :lock-to-live="true"
              :live-delay="18"
              :error-label="
                camera.status === 'OFFLINE'
                  ? 'Não foi possível iniciar a fonte da câmera offline.'
                  : undefined
              "
            />
          </div>
          <div v-else class="grid aspect-video place-items-center px-6 text-center text-white">
            <div>
              <span class="material-symbols-outlined text-5xl text-[#7AA6C8]" aria-hidden="true"
                >videocam</span
              >
              <p class="mt-2 font-semibold">
                {{
                  canPlay
                    ? 'Transmissão pausada'
                    : camera.status === 'OFFLINE'
                      ? 'Fonte de transmissão não configurada'
                      : 'Transmissão indisponível'
                }}
              </p>
              <p class="mt-1 text-xs text-slate-300">
                {{
                  canPlay
                    ? 'Inicie novamente quando desejar.'
                    : 'Esta câmera não possui uma fonte autorizada para reprodução.'
                }}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800"
          :class="
            playing ? 'border border-slate-300 dark:border-slate-600' : 'bg-[#2768CA] text-white'
          "
          :disabled="!canPlay"
          @click="togglePlayback"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{
            playing ? 'stop_circle' : 'play_circle'
          }}</span>
          {{
            playing
              ? 'Pausar transmissão'
              : canPlay
                ? 'Reproduzir ao vivo'
                : camera.status === 'OFFLINE'
                  ? 'Fonte de transmissão não configurada'
                  : 'Transmissão indisponível'
          }}
        </button>

        <p
          v-if="camera.status === 'INACTIVE'"
          class="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
          role="status"
        >
          Esta câmera está inativa: transmissão e predições ficam desabilitadas.
        </p>

        <dl class="my-5 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-[#071F36]">
            <dt class="text-slate-500 dark:text-slate-400">Stream</dt>
            <dd class="mt-1 font-semibold">{{ camera.operational.stream.status }}</dd>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-[#071F36]">
            <dt class="text-slate-500 dark:text-slate-400">Verificado em</dt>
            <dd class="mt-1 font-semibold">
              {{ formatCameraDate(camera.operational.stream.checked_at) }}
            </dd>
          </div>
        </dl>

        <div
          v-if="camera.status === 'OFFLINE'"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#071F36]"
          role="status"
        >
          <h3 class="font-semibold">Sem análise automática · somente transmissão</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Esta câmera pode ser inspecionada ao vivo, mas não exibe predições enquanto estiver offline.
          </p>
        </div>
        <CameraAnalysisDetails
          :camera="camera"
          :wide="props.nearbyLayout === 'side'"
        />
      </div>

      <div
        class="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800"
        :class="
          props.nearbyLayout === 'side'
            ? 'lg:col-start-2 lg:row-start-1 lg:mt-0 lg:border-t-0 lg:border-l lg:pl-6'
            : ''
        "
      >
        <NearbyCameraDock
          :cameras="nearbyCameras"
          :loading="nearbyLoading"
          :error="nearbyError"
          vertical
          @select="openNearbyCamera"
        />
      </div>
    </div>

    <RouterLink
      :to="`/cameras/${camera.id}`"
      class="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-[#2768CA] px-4 py-2 text-sm font-semibold text-[#2768CA] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
    >
      Abrir página da câmera
    </RouterLink>
    </div>
  </section>
</template>
