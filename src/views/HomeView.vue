<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { HomeCameraCarousel, usePriorityCameras } from '@/modules/cameras'
import type { CameraApiItem } from '@/modules/cameras'
import {
  DataMapboxPopup,
  MapboxComp,
  MobileMapContextDock,
  TablePoints,
} from '@/modules/flood-map'
import type { MapContextState } from '@/modules/flood-map'
import { useFloodPointsMap } from '@/modules/flood-points'
import { useScreenSize } from '@/shared'
import { localePath } from '@/app/i18n'

const { cameras, loading, error } = usePriorityCameras()
const router = useRouter()
const { tablePoints } = useFloodPointsMap()
const { isMobile } = useScreenSize()
const selectedCameraId = ref<string | null>(null)
const globalSelectedCameraId = ref<string | null>(null)
const mobileCameraDockOpen = ref(true)
const mapContext = ref<MapContextState>({ kind: 'closed' })
const mapbox = ref<{ closeContext: () => void } | null>(null)

const contextualContent = computed(() =>
  mapContext.value.kind === 'closed' ? null : mapContext.value,
)
const floodContext = computed(() =>
  mapContext.value.kind === 'flood' ? mapContext.value : null,
)
const filteredByFlood = computed(() => Boolean(floodContext.value?.cameras.length))
const displayedCameras = computed(() =>
  filteredByFlood.value ? floodContext.value?.cameras ?? [] : cameras.value,
)
const mobileDockMode = computed<'hidden' | 'camera' | 'context'>(() => {
  if (contextualContent.value && !filteredByFlood.value) return 'context'
  return mobileCameraDockOpen.value && selectedCameraId.value ? 'camera' : 'hidden'
})

watch(
  cameras,
  (catalog) => {
    if (!catalog.length) {
      selectedCameraId.value = null
      globalSelectedCameraId.value = null
      return
    }
    if (!catalog.some((camera) => camera.id === globalSelectedCameraId.value)) {
      globalSelectedCameraId.value = catalog[0]?.id ?? null
    }
    if (!filteredByFlood.value) {
      selectedCameraId.value = globalSelectedCameraId.value
    }
  },
  { immediate: true },
)

watch(
  mapContext,
  (context, previous) => {
    if (context.kind === 'flood' && context.cameras.length) {
      mobileCameraDockOpen.value = true
      if (!context.cameras.some((camera) => camera.id === selectedCameraId.value)) {
        selectedCameraId.value = context.cameras[0]?.id ?? null
      }
      return
    }
    if (previous?.kind === 'flood') selectedCameraId.value = globalSelectedCameraId.value
  },
  { deep: true },
)

function selectCamera(camera: CameraApiItem) {
  selectedCameraId.value = camera.id
  globalSelectedCameraId.value = camera.id
  mobileCameraDockOpen.value = true
}

function updateCarouselSelection(id: string) {
  selectedCameraId.value = id
  if (!filteredByFlood.value) globalSelectedCameraId.value = id
}

function closeContext() {
  mapbox.value?.closeContext()
  mapContext.value = { kind: 'closed' }
}

function dismissMobileCameraDock() {
  if (!isMobile.value) return
  mobileCameraDockOpen.value = false
}

function openRelatedCamera(camera: CameraApiItem) {
  mapContext.value = { kind: 'camera', camera }
}

function inspectCamera(camera: CameraApiItem) {
  void router.push(localePath(`/cameras/${camera.id}`))
}
</script>

<template>
  <section class="relative">
    <MapboxComp
      ref="mapbox"
      :show-items="true"
      :cameras="cameras"
      camera-selection-mode
      contextual-popup
      :render-context-popup="false"
      :show-desktop-info-panel="false"
      :selected-camera-id="selectedCameraId"
      :aria-busy="loading"
      :aria-description="error ?? undefined"
      @camera-select="selectCamera"
      @context-change="mapContext = $event"
      @map-dismiss="dismissMobileCameraDock"
    />

    <aside
      v-if="!isMobile"
      class="absolute top-16 bottom-4 left-3 z-20 hidden w-[min(36rem,38vw)] auto-rows-max content-start gap-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] md:grid dark:border-slate-700 dark:bg-[#001C3B]"
      aria-label="Pontos atuais e monitoramento por câmeras"
    >
      <div class="pb-2">
        <TablePoints :points="tablePoints" external-scroll />
      </div>
      <HomeCameraCarousel
        :selected-camera-id="selectedCameraId"
        :cameras="displayedCameras"
        :loading="loading"
        :error="error"
        :context-count="floodContext?.cameras.length ?? null"
        @update:selected-camera-id="updateCarouselSelection"
        @show-all="closeContext"
        @inspect="inspectCamera"
      />
    </aside>

    <div
      v-if="!isMobile && contextualContent"
      class="absolute top-16 right-3 bottom-4 z-20 hidden w-[min(26rem,35vw)] md:block"
    >
      <DataMapboxPopup
        :context="contextualContent"
        embedded
        @close="closeContext"
        @open-camera="openRelatedCamera"
        @inspect-camera="inspectCamera"
      />
    </div>

    <MobileMapContextDock v-if="isMobile" :mode="mobileDockMode">
      <template #camera>
        <HomeCameraCarousel
          :selected-camera-id="selectedCameraId"
          :cameras="displayedCameras"
          :loading="loading"
          :error="error"
          :context-count="floodContext?.cameras.length ?? null"
          @update:selected-camera-id="updateCarouselSelection"
          @show-all="closeContext"
          @inspect="inspectCamera"
        />
      </template>
      <template #context>
        <DataMapboxPopup
          v-if="contextualContent"
          :context="contextualContent"
          embedded
          @close="closeContext"
          @open-camera="openRelatedCamera"
          @inspect-camera="inspectCamera"
        />
      </template>
    </MobileMapContextDock>
  </section>
</template>
