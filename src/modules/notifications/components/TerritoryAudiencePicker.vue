<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { FloodCameraMonitoringApi, cameraCoordinates, type CameraApiItem } from '@/modules/cameras'
import { toggleAudienceTerritory } from '../audienceSelection'
import { bbox } from '@turf/turf'
import { AddressingApi } from '@/modules/addressing'
import type { TerritoryCatalogOption, TerritoryFeatureCollection } from '@/modules/addressing'
import { AQUA_TERRITORY_CENTER, AQUA_TERRITORY_ZOOM } from '@/shared'

const props = defineProps<{
  regions: readonly TerritoryCatalogOption[]
  neighborhoods: readonly TerritoryCatalogOption[]
  regionsOnly?: boolean
  mapOnly?: boolean
  disabled?: boolean
  regionIds: string[]
  neighborhoodIds: string[]
}>()
const emit = defineEmits<{ change: [value: { regionIds: string[]; neighborhoodIds: string[] }] }>()
const level = ref<'region' | 'neighborhood'>(props.regionsOnly ? 'region' : 'neighborhood')
const search = ref('')
const regionFilter = ref('')
const hovered = ref('')
const container = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const mapError = ref('')
let map: mapboxgl.Map | null = null
let resize: ResizeObserver | null = null
let disposed = false
let loadTimeout: ReturnType<typeof setTimeout> | undefined
const showCameras = ref(false)
const camerasLoading = ref(false)
const cameraError = ref('')
const cameraCount = ref(0)
const cameraAbort = new AbortController()
let cameras: CameraApiItem[] | null = null
let cameraMarkers: mapboxgl.Marker[] = []
let mapReady = false
function clearCameras() {
  cameraMarkers.forEach((marker) => marker.remove())
  cameraMarkers = []
}
function renderCameras() {
  clearCameras()
  if (!map || !mapReady || !showCameras.value || disposed) return
  for (const camera of cameras ?? []) {
    const coordinates = cameraCoordinates(camera)
    if (!coordinates) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'camera-map-marker'
    button.setAttribute('aria-label', camera.description || 'Câmera')
    const icon = document.createElement('span')
    icon.className = 'material-symbols-outlined'
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = 'videocam'
    button.append(icon)
    const marker = new mapboxgl.Marker({ element: button })
      .setLngLat(coordinates)
      .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(camera.description || 'Câmera'))
      .addTo(map)
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      marker.togglePopup()
    })
    cameraMarkers.push(marker)
  }
}
async function loadCameras() {
  if (camerasLoading.value) return
  if (cameras) {
    renderCameras()
    return
  }
  camerasLoading.value = true
  cameraError.value = ''
  try {
    const api = new FloodCameraMonitoringApi()
    const result: CameraApiItem[] = []
    let page = 1
    while (!disposed) {
      const response = await api.getCameras({ page }, cameraAbort.signal)
      result.push(...response.results)
      if (!response.next) break
      page++
    }
    if (disposed) return
    cameras = [...new Map(result.map((camera) => [camera.id, camera])).values()]
    cameraCount.value = cameras.filter((camera) => cameraCoordinates(camera)).length
    renderCameras()
  } catch {
    if (!disposed) cameraError.value = 'Não foi possível carregar as câmeras.'
  } finally {
    camerasLoading.value = false
  }
}
watch(showCameras, (visible) => {
  if (visible) void loadCameras()
  else clearCameras()
})
const empty = (): TerritoryFeatureCollection => ({ type: 'FeatureCollection', features: [] })
let data = { region: empty(), neighborhood: empty() }
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
const options = computed(() =>
  (level.value === 'region' ? props.regions : props.neighborhoods)
    .filter(
      (item) =>
        (level.value !== 'neighborhood' ||
          !regionFilter.value ||
          item.regionId === regionFilter.value) &&
        normalize(item.name).includes(normalize(search.value)),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
)
const selected = computed(() => [
  ...props.regions
    .filter((item) => props.regionIds.includes(item.id))
    .map((item) => ({ ...item, kind: 'region' as const })),
  ...props.neighborhoods
    .filter((item) => props.neighborhoodIds.includes(item.id))
    .map((item) => ({ ...item, kind: 'neighborhood' as const })),
])
function isSelected(kind: 'region' | 'neighborhood', id: string) {
  return (kind === 'region' ? props.regionIds : props.neighborhoodIds).includes(id)
}
function toggle(kind: 'region' | 'neighborhood', id: string) {
  if (props.disabled) return
  emit(
    'change',
    toggleAudienceTerritory(
      { regionIds: props.regionIds, neighborhoodIds: props.neighborhoodIds },
      props.neighborhoods,
      kind,
      id,
    ),
  )
}
function syncMap() {
  if (!map?.getLayer('audience-region-fill')) return
  for (const kind of ['region', 'neighborhood'] as const) {
    const ids = kind === 'region' ? props.regionIds : props.neighborhoodIds
    const chosen: mapboxgl.ExpressionSpecification = ['in', ['get', 'id'], ['literal', ids]]
    map.setPaintProperty(`audience-${kind}-fill`, 'fill-color', [
      'case',
      chosen,
      '#2563eb',
      '#94a3b8',
    ])
    map.setPaintProperty(`audience-${kind}-fill`, 'fill-opacity', ['case', chosen, 0.48, 0.08])
    for (const suffix of ['fill', 'line', 'label'])
      map.setLayoutProperty(
        `audience-${kind}-${suffix}`,
        'visibility',
        level.value === kind ? 'visible' : 'none',
      )
  }
}
function fitSelection() {
  if (!map) return
  const features = [...data.region.features, ...data.neighborhood.features].filter((feature) =>
    isSelected(
      feature.properties.type === 'region' ? 'region' : 'neighborhood',
      feature.properties.id,
    ),
  )
  const collection = features.length
    ? { type: 'FeatureCollection' as const, features }
    : data.region
  if (!collection.features.length) return
  const bounds = bbox(collection)
  map.fitBounds(
    [
      [bounds[0]!, bounds[1]!],
      [bounds[2]!, bounds[3]!],
    ],
    { padding: 36, maxZoom: 13, duration: 500 },
  )
}
async function initialize() {
  mapError.value = ''
  loading.value = true
  try {
    const api = new AddressingApi()
    const [regions, neighborhoods] = await Promise.all([
      api.getRegionTerritories(),
      props.regionsOnly ? Promise.resolve(empty()) : api.getNeighborhoodTerritories(),
    ])
    if (disposed || !container.value) return
    data = {
      region: {
        ...regions,
        features: regions.features.filter((f) =>
          props.regions.some((item) => item.id === f.properties.id),
        ),
      },
      neighborhood: {
        ...neighborhoods,
        features: neighborhoods.features.filter((f) =>
          props.neighborhoods.some((item) => item.id === f.properties.id),
        ),
      },
    }
    if (!data.region.features.length && !data.neighborhood.features.length)
      throw new Error('No boundaries')
    const token = import.meta.env.VITE_MAPBOX_API_KEY
    if (!token || !mapboxgl.supported()) throw new Error('Map unavailable')
    map = new mapboxgl.Map({
      container: container.value,
      accessToken: token,
      style: 'mapbox://styles/mapbox/light-v11',
      center: AQUA_TERRITORY_CENTER,
      zoom: AQUA_TERRITORY_ZOOM,
      cooperativeGestures: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    resize = new ResizeObserver(() => map?.resize())
    resize.observe(container.value)
    loadTimeout = setTimeout(() => {
      loading.value = false
      mapError.value = 'O mapa está demorando para carregar. Você pode continuar pela lista.'
    }, 15000)
    map.on('error', () => {
      loading.value = false
      mapError.value =
        'Não foi possível carregar parte do mapa. A seleção pela lista continua disponível.'
    })
    map.on('load', () => {
      if (!map) return
      clearTimeout(loadTimeout)
      for (const kind of ['region', 'neighborhood'] as const) {
        const source = `audience-${kind}`
        map.addSource(source, { type: 'geojson', data: data[kind] })
        map.addLayer({
          id: `${source}-fill`,
          source,
          type: 'fill',
          paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.1 },
        })
        map.addLayer({
          id: `${source}-line`,
          source,
          type: 'line',
          paint: { 'line-color': '#35618b', 'line-width': 1.2 },
        })
        map.addLayer({
          id: `${source}-label`,
          source,
          type: 'symbol',
          layout: { 'text-field': ['get', 'name'], 'text-size': 11 },
          paint: { 'text-color': '#163354', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
        })
      }
      map.on('click', (event) => {
        const feature = map?.queryRenderedFeatures(event.point, {
          layers: [`audience-${level.value}-fill`],
        })[0]
        const id = feature?.properties?.id
        const catalog = level.value === 'region' ? props.regions : props.neighborhoods
        if (typeof id === 'string' && catalog.some((item) => item.id === id))
          toggle(level.value, id)
      })
      map.on('mousemove', (event) => {
        const feature = map?.queryRenderedFeatures(event.point, {
          layers: [`audience-${level.value}-fill`],
        })[0]
        hovered.value = String(feature?.properties?.name ?? '')
        if (map) map.getCanvas().style.cursor = feature ? 'pointer' : ''
      })
      map.on('mouseout', () => {
        hovered.value = ''
      })
      loading.value = false
      mapReady = true
      renderCameras()
      syncMap()
      fitSelection()
    })
  } catch {
    if (!disposed) {
      loading.value = false
      mapError.value = 'Mapa indisponível. Use a busca e a lista para selecionar o público.'
    }
  }
}
watch([() => props.regionIds, () => props.neighborhoodIds, level], syncMap, { deep: true })
onMounted(initialize)
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(loadTimeout)
  cameraAbort.abort()
  clearCameras()
  resize?.disconnect()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="audience-picker">
    <div class="picker-toolbar">
      <div v-if="!regionsOnly" class="level-switch" aria-label="Tipo de território">
        <button
          v-for="kind in ['region', 'neighborhood'] as const"
          :key="kind"
          type="button"
          :aria-pressed="level === kind"
          @click="level = kind"
        >
          {{ kind === 'region' ? 'Regiões' : 'Bairros' }}
        </button>
      </div>
      <button
        type="button"
        class="camera-toggle"
        :aria-pressed="showCameras"
        @click="showCameras = !showCameras"
      >
        <span class="material-symbols-outlined" aria-hidden="true">videocam</span>
        {{ showCameras ? 'Esconder câmeras' : 'Mostrar câmeras' }}
      </button>
      <button type="button" class="text-action" @click="fitSelection">Enquadrar seleção</button>
    </div>
    <p class="picker-help">
      Clique em uma área para selecionar; clique novamente para remover. Uma região inclui todos os
      seus bairros.<template v-if="!regionsOnly">
        Ao remover um bairro, a região inteira deixa de ser selecionada.</template
      >
    </p>
    <p v-if="showCameras" class="picker-help" role="status">
      <template v-if="camerasLoading">Carregando câmeras…</template>
      <template v-else-if="cameraError"
        >{{ cameraError }}
        <button type="button" class="text-action" @click="loadCameras">
          Tentar novamente
        </button></template
      >
      <template v-else
        >{{ cameraCount }} câmeras com localização. Clique no ícone para identificar a
        câmera.</template
      >
    </p>
    <div class="picker-grid" :class="{ 'map-only': mapOnly }">
      <div class="map-panel">
        <div
          ref="container"
          class="audience-map"
          role="region"
          aria-label="Mapa de seleção do público. Use também a lista de territórios."
        />
        <p v-if="loading" class="map-notice" role="status">Carregando limites territoriais…</p>
        <p v-else-if="mapError" class="map-notice" role="status">{{ mapError }}</p>
        <p v-else class="map-caption">{{ hovered || 'Áreas azuis estão selecionadas' }}</p>
      </div>
      <div v-if="!mapOnly" class="territory-list-panel">
        <label for="audience-search">Buscar {{ level === 'region' ? 'região' : 'bairro' }}</label
        ><input id="audience-search" v-model="search" type="search" placeholder="Digite um nome…" />
        <template v-if="level === 'neighborhood'"
          ><label for="audience-region-filter">Filtrar por região</label
          ><select id="audience-region-filter" v-model="regionFilter">
            <option value="">Todas as regiões</option>
            <option v-for="region in regions" :key="region.id" :value="region.id">
              {{ region.name }}
            </option>
          </select></template
        >
        <p class="list-count">
          {{ options.length }} {{ options.length === 1 ? 'resultado' : 'resultados' }}
        </p>
        <div class="territory-options">
          <label
            v-for="item in options"
            :key="item.id"
            :class="{ selected: isSelected(level, item.id) }"
            ><input
              type="checkbox"
              :checked="isSelected(level, item.id)"
              :disabled="disabled"
              @change="toggle(level, item.id)"
            /><span>{{ item.name }}</span></label
          >
          <p v-if="!options.length" class="picker-help">
            Nenhum território encontrado. Tente outro nome.
          </p>
        </div>
      </div>
    </div>
    <div v-if="!mapOnly" class="selection-heading">
      <p role="status">
        {{ regionIds.length }} {{ regionIds.length === 1 ? 'região' : 'regiões' }} e
        {{ neighborhoodIds.length }}
        {{ neighborhoodIds.length === 1 ? 'bairro selecionado' : 'bairros selecionados' }}
      </p>
      <button
        v-if="selected.length"
        type="button"
        class="text-action"
        @click="emit('change', { regionIds: [], neighborhoodIds: [] })"
      >
        Limpar seleção
      </button>
    </div>
    <ul v-if="!mapOnly" class="selection-chips">
      <li v-for="item in selected" :key="`${item.kind}-${item.id}`">
        <button
          type="button"
          :aria-label="`Remover ${item.kind === 'region' ? 'região' : 'bairro'} ${item.name}`"
          @click="toggle(item.kind, item.id)"
        >
          {{ item.name }} <span aria-hidden="true">×</span>
        </button>
      </li>
    </ul>
    <p v-if="!mapOnly && !selected.length" class="picker-help">
      Selecione pelo menos uma região ou um bairro para continuar.
    </p>
  </div>
</template>

<style scoped>
.picker-grid.map-only {
  grid-template-columns: minmax(0, 1fr);
}
.camera-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid #b9c8d9;
  border-radius: 10px;
  color: #245fbb;
  background: white;
  font-weight: 600;
}
.camera-toggle[aria-pressed='true'] {
  background: #eff6ff;
  border-color: #2563eb;
}
:deep(.camera-map-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #2563eb;
  background: white;
  color: #245fbb;
  box-shadow: 0 2px 8px #0003;
  cursor: pointer;
}
:deep(.camera-map-marker:focus-visible) {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
}
:deep(.mapboxgl-popup-content) {
  color: #163354;
}

.audience-picker {
  min-width: 0;
}
.picker-toolbar,
.selection-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.level-switch {
  display: flex;
  padding: 4px;
  border-radius: 12px;
  background: #edf2f8;
}
.level-switch button {
  min-height: 40px;
  padding: 8px 18px;
  border-radius: 9px;
  font-weight: 600;
  font-size: 14px;
  color: #425570;
}
.level-switch button[aria-pressed='true'] {
  background: #245fbb;
  color: white;
}
.text-action {
  color: #245fbb;
  font-size: 13px;
  min-height: 44px;
  padding: 8px;
  text-decoration: underline;
}
.picker-help {
  font-size: 13px;
  line-height: 1.65;
  color: #52627a;
  margin: 12px 0;
}
.picker-grid {
  display: grid;
  gap: 16px;
}
.map-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid #d1dce8;
  border-radius: 14px;
  background: #edf2f8;
  min-width: 0;
}
.audience-map {
  width: 100%;
  height: 370px;
}
.map-notice,
.map-caption {
  position: absolute;
  bottom: 36px;
  left: 12px;
  right: 48px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 9px;
  color: #243f5f;
  font-size: 12px;
  box-shadow: 0 2px 10px #0001;
  pointer-events: none;
}
.territory-list-panel {
  min-width: 0;
}
.territory-list-panel > label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 6px;
}
.territory-list-panel > input,
select {
  width: 100%;
  min-width: 0;
  border: 1px solid #b9c8d9;
  border-radius: 10px;
  min-height: 44px;
  padding: 10px;
  font-size: 16px;
  margin-bottom: 12px;
  background: transparent;
}
.list-count {
  font-size: 12px;
  color: #52627a;
  margin-bottom: 8px;
}
.territory-options {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #dce4ed;
  border-radius: 10px;
}
.territory-options label {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 10px;
  font-size: 14px;
  border-bottom: 1px solid #e5ebf3;
  cursor: pointer;
}
.territory-options label.selected {
  background: #edf4ff;
}
.territory-options input {
  width: 18px;
  height: 18px;
  accent-color: #245fbb;
  flex-shrink: 0;
}
.selection-heading {
  margin-top: 16px;
  font-size: 13px;
  font-weight: 600;
}
.selection-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  margin-top: 8px;
}
.selection-chips button {
  min-height: 40px;
  border: 1px solid #c0d6f8;
  background: #edf4ff;
  color: #24528b;
  border-radius: 99px;
  padding: 8px 12px;
  font-size: 12px;
  text-align: left;
}
button {
  cursor: pointer;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #75a7f3;
  outline-offset: 2px;
}
@media (min-width: 1100px) {
  .picker-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
  }
  .audience-map {
    height: 440px;
  }
}
:global(.dark) .picker-help,
:global(.dark) .list-count {
  color: #b3c3d7;
}
:global(.dark) .level-switch,
:global(.dark) .territory-options label.selected {
  background: #183a5c;
}
:global(.dark) .text-action,
:global(.dark) .level-switch button {
  color: #badaff;
}
:global(.dark) .selection-chips button {
  background: #183a5c;
  color: #badaff;
}
</style>
