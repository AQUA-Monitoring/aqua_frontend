<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useGeolocationStore } from '@/stores/geolocation'
import { useFloodPointDraftStore, useFloodPointsMap } from '@/modules/flood-points'
import { useMachineLearningMap } from '@/modules/forecast'
import DataMapboxPopup from './dataMapboxPopup.vue'
import HeaderMapbox from './headerMapbox.vue'
import InfoPoints from './infoPoints.vue'
import LayersFilters from './layersFilters.vue'
import { useNeighborhood } from '@/modules/addressing'
import { useScreenSize } from '@/shared'
import { localePath } from '@/app/i18n'
import { useFloodCameraMonitoringStore } from '@/modules/cameras'
import type { CameraApiItem } from '@/modules/cameras'
import { useLoadingStore } from '@/stores/loading'
import type mapboxgl from 'mapbox-gl'
import { useMapSourcesLayers } from '../composables/useMapSourcesLayers'
import { useMapCameraMarkers } from '../composables/useMapCameraMarkers'
import { useMapPopup } from '../composables/useMapPopup'
import type { MapContextState } from '../composables/useMapPopup'
import { useFloodAreaDrawing } from '../composables/useFloodAreaDrawing'
import { useMapLifecycle } from '../composables/useMapLifecycle'

const props = withDefaults(
  defineProps<{
    showItems?: boolean
    draftProbability?: number | null
    cameras?: CameraApiItem[]
    cameraSelectionMode?: boolean
    selectedCameraId?: string | null
    showDesktopInfoPanel?: boolean
    contextualPopup?: boolean
    renderContextPopup?: boolean
  }>(),
  {
    showItems: false,
    draftProbability: null,
    cameras: undefined,
    cameraSelectionMode: false,
    selectedCameraId: null,
    showDesktopInfoPanel: true,
    contextualPopup: false,
    renderContextPopup: true,
  },
)
const emit = defineEmits<{
  cameraSelect: [camera: CameraApiItem]
  contextChange: [context: MapContextState]
  contextClose: []
  contextOpenChange: [open: boolean]
  mapDismiss: []
}>()

const route = useRoute()
const router = useRouter()
const geolocation = useGeolocationStore()
const { loadNeighborhoods, getLocalization } = useNeighborhood()
const { activeGeoJson, activePoints, selectFlood, clearSelectedFlood, selectedFlood } = useFloodPointsMap()
const { geoJson: mlGeoJson } = useMachineLearningMap()
const { isMobile } = useScreenSize()
const ctrl = useFloodCameraMonitoringStore()
const floodDraft = useFloodPointDraftStore()
const isRegisterRoute = computed(() => String(route.name).replace(/-en$/, '') === 'register-point')
const loadingStore = useLoadingStore()
const mapContainerRef = ref<HTMLElement | null>(null)
const mapRef = shallowRef<mapboxgl.Map | null>(null)
const sources = useMapSourcesLayers()
const popup = useMapPopup({
  getLocalization,
  cameras: computed(() => props.cameras ?? ctrl.camerasRaw),
  activePoints,
  activeGeoJson,
  selectFlood,
  clearSelectedFlood,
})
const markers = useMapCameraMarkers(ctrl, {
  cameras: computed(() => props.cameras ?? ctrl.camerasRaw),
  selectionMode: toRef(props, 'cameraSelectionMode'),
  selectedCameraId: toRef(props, 'selectedCameraId'),
  onSelect: (camera) => {
    popup.close()
    emit('cameraSelect', camera)
  },
  interactionMode: computed(() =>
    props.cameraSelectionMode ? 'select' : props.contextualPopup ? 'popup' : 'navigate',
  ),
  onPopup: (camera) => popup.openCamera(camera),
})
const drawing = useFloodAreaDrawing(mapRef, floodDraft, toRef(props, 'draftProbability'))
const {
  isDrawing, markingMode, polygonVertexCount, radiusMeters, isLocating,
  startDrawing, startRadiusDrawing, finishPolygon, editDrawing, cancelDrawing,
  clearDrawing, centerOnUserLocation,
} = drawing
const { mapReady } = useMapLifecycle({
  containerRef: mapContainerRef,
  mapRef,
  isRegisterRoute,
  isMobile,
  longitude: computed(() => geolocation.longitude),
  latitude: computed(() => geolocation.latitude),
  activeGeoJson,
  mlGeoJson,
  selectedFlood,
  showCameras: computed(() => ctrl.showCameras),
  loadNeighborhoods,
  startLoading: loadingStore.start,
  stopLoading: loadingStore.stop,
  syncFlood: sources.syncFlood,
  syncMachineLearning: sources.syncMachineLearning,
  setupMarkers: markers.setup,
  setMarkersVisible: markers.setVisible,
  cleanupMarkers: markers.cleanup,
  handleMapClick: (map, event) => {
    if (!props.contextualPopup) return
    const result = popup.handleClick(map, event)
    if (result === 'dismiss') emit('mapDismiss')
  },
  syncSelectedFlood: () => undefined,
  setupDrawing: drawing.setup,
  cleanupDrawing: drawing.cleanup,
  countPolygonVertex: drawing.countPolygonVertex,
  updateDraftColor: drawing.updateDraftColor,
  draftColor: drawing.draftColor,
})

watch(
  () => props.cameras,
  () => {
    if (mapReady.value && mapRef.value) markers.setup(mapRef.value)
  },
  { deep: true },
)

watch(
  () => props.selectedCameraId,
  () => markers.updateSelection(),
)

watch(
  popup.context,
  (context, previous) => {
    emit('contextChange', context)
    const open = context.kind !== 'closed'
    emit('contextOpenChange', open)
    if (context.kind === 'closed' && previous?.kind !== 'closed') emit('contextClose')
  },
  { deep: true, immediate: true },
)

function closeContext() {
  popup.close()
}

function inspectCamera(camera: CameraApiItem) {
  void router.push(localePath(`/cameras/${camera.id}`))
}

defineExpose({ closeContext })
</script>

<template>
  <div
    class="relative w-full overflow-hidden rounded-2xl"
    :class="
      isRegisterRoute
        ? 'h-[62vh] min-h-120 lg:h-[calc(100vh-11rem)]'
        : 'h-dvh min-h-150 md:h-[42vw]'
    "
  >
    <div ref="mapContainerRef" class="h-full w-full overflow-hidden md:rounded-2xl"></div>

    <template v-if="isRegisterRoute">
      <div
        class="absolute top-20 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:bg-[#00182F]/95 md:top-3 md:left-1/2 md:-translate-x-1/2"
        @pointerdown.stop
        @click.stop
      >
        <p class="flex items-start gap-2 text-xs font-medium md:text-sm">
          <span class="material-symbols-outlined text-lg text-[#2768CA]">gesture</span>
          <span v-if="markingMode === 'radius'"
            >Escolha o raio e toque no centro do alagamento para demarcar a área.</span
          >
          <span v-else-if="isDrawing"
            >Marque os limites da área e toque no primeiro ponto para concluir.</span
          >
          <span v-else-if="floodDraft.hasGeometry"
            >Área marcada. Arraste os pontos para ajustar o contorno.</span
          >
          <span v-else>Busque um endereço e marque no mapa a área afetada.</span>
        </p>
        <div v-if="markingMode === 'radius'" class="mt-3 border-t border-[#DCDCDC] pt-3">
          <div class="flex items-center justify-between gap-4 text-xs">
            <label for="radius-size" class="font-semibold">Raio da área</label>
            <strong class="text-[#2768CA]">{{ radiusMeters }} m</strong>
          </div>
          <input
            id="radius-size"
            v-model.number="radiusMeters"
            type="range"
            min="20"
            max="500"
            step="10"
            class="mt-2 w-full accent-[#2768CA]"
          />
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="radius in [30, 50, 80, 150, 300, 500]"
              :key="radius"
              type="button"
              class="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
              :class="
                radiusMeters === radius
                  ? 'border-[#2768CA] bg-[#2768CA] text-white'
                  : 'border-[#7AA6C8] text-[#2768CA]'
              "
              @click.stop="radiusMeters = radius"
            >
              {{ radius }} m
            </button>
          </div>
        </div>
      </div>

      <div class="absolute right-3 bottom-5 z-10 flex flex-col items-end gap-2">
        <button v-if="isMobile"
          type="button"
          class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#2768CA] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60 dark:bg-[#00182F]"
          :disabled="!mapReady || isLocating"
          @click.stop="centerOnUserLocation"
        >
          <span class="material-symbols-outlined text-xl">my_location</span>
          {{ isLocating ? 'Localizando...' : 'Minha localização' }}
        </button>
        <div
          class="flex max-w-[calc(100vw-1.5rem)] flex-wrap justify-end gap-2"
          @pointerdown.stop
          @click.stop
        >
          <button
            v-if="markingMode === 'polygon'"
            type="button"
            class="flex items-center gap-2 rounded-full bg-[#2768CA] px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            :disabled="polygonVertexCount < 3"
            :title="
              polygonVertexCount < 3 ? 'Marque pelo menos três pontos' : 'Fechar e salvar a área'
            "
            @click.stop="finishPolygon"
          >
            <span class="material-symbols-outlined text-xl">check</span>
            {{ polygonVertexCount < 3 ? `${polygonVertexCount}/3 pontos` : 'Fechar polígono' }}
          </button>
          <button
            v-if="isDrawing"
            type="button"
            class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#DC2626] shadow-lg dark:bg-[#00182F]"
            @click.stop="cancelDrawing"
          >
            <span class="material-symbols-outlined text-xl">close</span>
            Cancelar
          </button>
          <button
            v-if="floodDraft.hasGeometry && !isDrawing"
            type="button"
            class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#2768CA] shadow-lg dark:bg-[#00182F]"
            @click.stop="editDrawing"
          >
            <span class="material-symbols-outlined text-xl">edit</span>
            Ajustar
          </button>
          <button
            v-if="floodDraft.hasGeometry"
            type="button"
            class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#DC2626] shadow-lg dark:bg-[#00182F]"
            @click.stop="clearDrawing"
          >
            <span class="material-symbols-outlined text-xl">restart_alt</span>
            Recomeçar
          </button>
          <button
            v-if="!isDrawing"
            type="button"
            class="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#2768CA] shadow-lg transition-colors hover:bg-[#2768CA]/10 disabled:opacity-60 dark:bg-[#00182F]"
            :disabled="!mapReady"
            @click.stop="startRadiusDrawing"
          >
            <span class="material-symbols-outlined text-xl">radio_button_checked</span>
            Raio rápido
          </button>
          <button
            v-if="!isDrawing"
            type="button"
            class="flex items-center gap-2 rounded-full bg-[#2768CA] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#1f57ad] disabled:opacity-60"
            :disabled="!mapReady"
            @click.stop="startDrawing"
          >
            <span class="material-symbols-outlined text-xl">{{
              floodDraft.hasGeometry ? 'add' : 'draw'
            }}</span>
            {{ floodDraft.hasGeometry ? 'Desenhar outra' : 'Desenhar área' }}
          </button>
        </div>
      </div>
    </template>

    <div v-if="showItems">
      <div v-if="!isMobile">
        <InfoPoints v-if="props.showDesktopInfoPanel" />
        <LayersFilters />
      </div>
      <div v-else class="absolute inset-0 pointer-events-none">
        <div class="pointer-events-auto">
          <HeaderMapbox />
        </div>
      </div>
    </div>
    <DataMapboxPopup
      v-if="
        props.contextualPopup &&
        props.renderContextPopup &&
        popup.context.value.kind !== 'closed'
      "
      :context="popup.context.value"
      @close="closeContext"
      @open-camera="popup.openCamera"
      @inspect-camera="inspectCamera"
    />
  </div>
</template>
