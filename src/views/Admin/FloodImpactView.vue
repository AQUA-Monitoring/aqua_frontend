<script setup lang="ts">
import { formatLocale } from '@/app/i18n'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'
import type { MultiPolygon } from 'geojson'
import { FloodCameraMonitoringApi } from '@/modules/cameras'
import {
  FloodImpactApi,
  FloodImpactMap,
  useFloodImpact,
  type AffectedAreaReference,
  type FloodEvidenceKind,
  type FloodHotspot,
  type FloodImpactFilters,
  type FloodSpatialEvent,
} from '@/modules/flood-impact'
import type { CityDto } from '@/modules/cameras'
import { parseApiError } from '@/shared'
import { formatTerritoryLabel } from '@/shared'

const territoryApi = new FloodCameraMonitoringApi()
const impactApi = new FloodImpactApi()
const impact = useFloodImpact()
const cities = ref<CityDto[]>([])
const activeTab = ref<'events' | 'hotspots'>('events')
const footprint = ref<MultiPolygon | null>(null)
const submitting = ref(false)
const mapMessage = ref<string | null>(null)
const selectedEventId = ref('')

const filters = reactive<FloodImpactFilters>({
  city_id: '',
  evidence_kind: '',
  period_start: '',
  period_end: '',
})
const form = reactive({
  city: '',
  evidence_kind: 'CAMERA_OBSERVATION' as FloodEvidenceKind,
  confidence: null as number | null,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: '',
  source: '',
  justification: '',
})

const evidenceLabels: Record<FloodEvidenceKind, string> = {
  FORECAST: 'Previsão',
  CAMERA_OBSERVATION: 'Observação por câmera',
  USER_REPORT: 'Relato de usuário',
  CONFIRMED_OCCURRENCE: 'Ocorrência confirmada',
  LEGACY_UNCLASSIFIED: 'Legado não classificado',
}

const statusLabels = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  SUPERSEDED: 'Substituído',
  REVOKED: 'Revogado',
}

const selectedEvent = computed(
  () => impact.events.find((event) => event.id === selectedEventId.value) ?? null,
)

function affectedAreaNames(items: AffectedAreaReference[] | null | undefined) {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    if (!item || typeof item.name !== 'string') return []
    const label = formatTerritoryLabel(item.name)
    return label ? [label] : []
  })
}

const selectedAffectedRegions = computed(() => affectedAreaNames(selectedEvent.value?.affected_regions))
const selectedAffectedStreets = computed(() => affectedAreaNames(selectedEvent.value?.affected_streets))

function cleanFilters(): FloodImpactFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
  ) as FloodImpactFilters
}

async function refreshCurrentTab() {
  if (activeTab.value === 'events') await impact.loadEvents(cleanFilters())
  else await impact.loadHotspots(cleanFilters())
}

async function chooseEvent(event: FloodSpatialEvent) {
  selectedEventId.value = event.id
  footprint.value = event.footprint
    ? event.footprint.type === 'Feature'
      ? event.footprint.geometry
      : event.footprint
    : null
  form.city = event.city
  form.evidence_kind = event.evidence_kind
  await impact.selectEvent(event)
}

async function chooseHotspotById(id: string) {
  const hotspot = impact.hotspots.find((item) => item.id === id)
  if (hotspot) await impact.selectHotspot(hotspot)
}

async function createOrRevise() {
  if (!footprint.value) {
    mapMessage.value = 'Desenhe uma mancha válida no mapa antes de salvar.'
    return
  }
  if (!form.city) {
    mapMessage.value = 'Selecione a cidade da evidência.'
    return
  }
  submitting.value = true
  mapMessage.value = null
  try {
    if (selectedEvent.value) {
      if (!form.justification.trim()) {
        mapMessage.value = 'Informe a justificativa para preservar o histórico da revisão.'
        return
      }
      await impactApi.createRevision(selectedEvent.value.id, {
        footprint: footprint.value,
        justification: form.justification.trim(),
        source_revision: selectedEvent.value.current_revision,
      })
      toast.success('Nova revisão territorial salva.')
    } else {
      const created = await impactApi.createEvent({
        city: form.city,
        evidence_kind: form.evidence_kind,
        geometry_method: 'MANUAL',
        footprint: footprint.value,
        confidence: form.confidence,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        source: form.source.trim() || undefined,
      })
      selectedEventId.value = created.id
      toast.success('Evento salvo como rascunho.')
    }
    await impact.loadEvents(cleanFilters())
  } catch (error: unknown) {
    const parsed = parseApiError(error, 'Não foi possível salvar a evidência territorial.')
    mapMessage.value = parsed.message
  } finally {
    submitting.value = false
  }
}

async function transition(action: 'activate' | 'revoke' | 'recalculate') {
  const event = selectedEvent.value
  if (!event) return
  submitting.value = true
  try {
    if (action === 'activate') await impactApi.activateEvent(event.id)
    else if (action === 'revoke') await impactApi.revokeEvent(event.id)
    else await impactApi.recalculateEvent(event.id)
    toast.success(
      action === 'activate'
        ? 'Evento ativado.'
        : action === 'revoke'
          ? 'Evento revogado sem apagar o histórico.'
          : 'Recálculo solicitado.',
    )
    await impact.loadEvents(cleanFilters())
    const refreshed = impact.events.find((item) => item.id === event.id)
    if (refreshed) await chooseEvent(refreshed)
  } catch (error: unknown) {
    mapMessage.value = parseApiError(error, 'Não foi possível alterar o evento.').message
  } finally {
    submitting.value = false
  }
}

function startNewEvent() {
  selectedEventId.value = ''
  impact.selectEvent(null)
  footprint.value = null
  form.justification = ''
  mapMessage.value = null
}

function selectHotspot(hotspot: FloodHotspot) {
  impact.selectHotspot(hotspot)
}

onMounted(async () => {
  try {
    cities.value = await territoryApi.getCities()
  } catch {
    mapMessage.value = 'Não foi possível carregar as cidades da Base georreferenciada oficial.'
  }
  await impact.loadEvents()
})
</script>

<template>
  <section class="mx-auto mt-5 w-full max-w-[96rem] px-4 pb-12 dark:text-white md:px-0">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-[0.18em] text-[#2768CA] uppercase">
          Administração · território
        </p>
        <h1 class="mt-1 text-2xl font-semibold md:text-3xl">Impacto viário e histórico</h1>
        <p class="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Registre a evidência espacial sem confundir previsão, relato, observação e ocorrência
          confirmada. Apenas os trechos realmente intersectados são destacados.
        </p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-[#2768CA] px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
        @click="startNewEvent"
      >
        Nova mancha
      </button>
    </header>

    <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Visões territoriais">
      <button
        v-for="tab in (['events', 'hotspots'] as const)"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab"
        class="rounded-full px-4 py-2 text-sm font-semibold"
        :class="activeTab === tab ? 'bg-[#2768CA] text-white' : 'bg-slate-100 dark:bg-[#071F36]'"
        @click="activeTab = tab; refreshCurrentTab()"
      >
        {{ tab === 'events' ? 'Eventos e trechos' : 'Pontos críticos' }}
      </button>
    </div>

    <form class="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4 dark:bg-[#071F36]" @submit.prevent="refreshCurrentTab">
      <label class="text-sm">Cidade
        <select v-model="filters.city_id" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900">
          <option value="">Todas</option><option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option>
        </select>
      </label>
      <label class="text-sm">Evidência
        <select v-model="filters.evidence_kind" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900">
          <option value="">Confirmadas por padrão</option><option v-for="(label, key) in evidenceLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <label class="text-sm">De <input v-model="filters.period_start" type="date" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
      <label class="text-sm">Até <input v-model="filters.period_end" type="date" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
      <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white md:col-start-4" type="submit">Aplicar filtros</button>
    </form>

    <p v-if="impact.error" class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">{{ impact.error }} Nenhum resultado foi presumido.</p>
    <p v-if="mapMessage" class="mt-4 rounded-xl border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900" role="alert">{{ mapMessage }}</p>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <FloodImpactMap
        v-model:footprint="footprint"
        :editable="activeTab === 'events'"
        :affected-roads="impact.affectedRoadsGeoJSON"
        :hotspots="impact.hotspotsGeoJSON"
        @invalid="mapMessage = $event"
        @select-hotspot="chooseHotspotById"
      />

      <aside class="space-y-4">
        <template v-if="activeTab === 'events'">
          <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 class="font-semibold">{{ selectedEvent ? 'Revisar mancha' : 'Nova evidência' }}</h2>
            <div class="mt-3 grid gap-3">
              <label class="text-sm">Cidade<select v-model="form.city" :disabled="!!selectedEvent" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"><option value="">Selecione</option><option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option></select></label>
              <label class="text-sm">Natureza<select v-model="form.evidence_kind" :disabled="!!selectedEvent" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"><option v-for="(label, key) in evidenceLabels" :key="key" :value="key">{{ label }}</option></select></label>
              <label class="text-sm">Válida desde<input v-model="form.valid_from" type="datetime-local" :disabled="!!selectedEvent" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
              <label v-if="selectedEvent" class="text-sm">Justificativa da revisão<textarea v-model="form.justification" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
              <button type="button" :disabled="submitting" class="rounded-lg bg-[#2768CA] px-4 py-2 font-semibold text-white disabled:opacity-50" @click="createOrRevise">{{ selectedEvent ? 'Salvar nova revisão' : 'Salvar rascunho' }}</button>
            </div>
          </div>

          <div class="max-h-72 overflow-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <h2 class="px-1 font-semibold">Eventos</h2>
            <p v-if="!impact.loading && !impact.events.length" class="p-3 text-sm text-slate-500">Nenhum evento encontrado.</p>
            <button v-for="event in impact.events" :key="event.id" type="button" class="mt-2 w-full rounded-xl border p-3 text-left text-sm" :class="selectedEventId === event.id ? 'border-[#2768CA] bg-blue-50 text-slate-900' : 'border-slate-200 dark:border-slate-700'" @click="chooseEvent(event)">
              <span class="font-semibold">{{ evidenceLabels[event.evidence_kind] }}</span>
              <span class="mt-1 block">{{ statusLabels[event.status] }} · {{ new Date(event.valid_from).toLocaleString(formatLocale()) }}</span>
            </button>
          </div>

          <div v-if="selectedEvent" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 class="font-semibold">Ações e trechos</h2>
            <p class="mt-1 text-sm">{{ impact.affectedRoads.length }} trecho(s) calculado(s).</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button v-if="selectedEvent.status === 'DRAFT'" type="button" class="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" @click="transition('activate')">Ativar</button>
              <button v-if="selectedEvent.status === 'ACTIVE'" type="button" class="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white" @click="transition('revoke')">Revogar</button>
              <button type="button" class="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white" @click="transition('recalculate')">Recalcular</button>
            </div>
          </div>

          <div v-if="selectedEvent" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 class="font-semibold">Área afetada derivada</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Referência territorial calculada a partir da mancha. Não confirma bloqueio de vias.
            </p>
            <dl class="mt-3 grid gap-3 text-sm">
              <div>
                <dt class="font-medium">Regiões</dt>
                <dd v-if="selectedAffectedRegions.length" class="mt-1 text-slate-600 dark:text-slate-300">
                  {{ selectedAffectedRegions.join(', ') }}
                </dd>
                <dd v-else class="mt-1 text-slate-500">Nenhuma região afetada informada.</dd>
              </div>
              <div>
                <dt class="font-medium">Ruas</dt>
                <dd v-if="selectedAffectedStreets.length" class="mt-1 text-slate-600 dark:text-slate-300">
                  {{ selectedAffectedStreets.join(', ') }}
                </dd>
                <dd v-else class="mt-1 text-slate-500">Nenhuma rua afetada informada.</dd>
              </div>
            </dl>
          </div>
        </template>

        <template v-else>
          <div class="max-h-[28rem] overflow-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <h2 class="px-1 font-semibold">Recorrência histórica</h2>
            <p v-if="!impact.loading && !impact.hotspots.length" class="p-3 text-sm text-slate-500">Nenhum ponto crítico encontrado para o período.</p>
            <button v-for="hotspot in impact.hotspots" :key="hotspot.id" type="button" class="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left text-sm dark:border-slate-700" @click="selectHotspot(hotspot)">
              <span class="font-semibold">{{ hotspot.name || hotspot.spatial_unit }}</span>
              <span class="mt-1 block">{{ hotspot.confirmed_event_count }} confirmados · índice {{ hotspot.recurrence_score.toFixed(1) }}</span>
            </button>
          </div>
          <div v-if="impact.selectedHotspot" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 class="font-semibold">Histórico e câmeras próximas</h2>
            <p class="mt-2 text-sm">{{ impact.hotspotHistory.length }} registro(s) histórico(s).</p>
            <ul v-if="impact.hotspotHistory.length" class="mt-3 space-y-2 text-sm">
              <li v-for="record in impact.hotspotHistory" :key="record.id" class="rounded-lg bg-slate-100 p-2 dark:bg-[#071F36]">
                <p class="font-medium">{{ evidenceLabels[record.evidence_kind] }} · {{ statusLabels[record.status] }}</p>
                <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Regiões: {{ affectedAreaNames(record.affected_regions).join(', ') || 'não informadas' }}
                </p>
                <p class="text-xs text-slate-600 dark:text-slate-300">
                  Ruas: {{ affectedAreaNames(record.affected_streets).join(', ') || 'não informadas' }}
                </p>
              </li>
            </ul>
            <p class="mt-3 text-xs text-slate-500">As áreas do histórico são derivadas e não confirmam bloqueios viários.</p>
            <ul v-if="impact.selectedHotspot.nearby_cameras?.length" class="mt-3 space-y-2 text-sm">
              <li v-for="camera in impact.selectedHotspot.nearby_cameras" :key="camera.id" class="rounded-lg bg-slate-100 p-2 dark:bg-[#071F36]">
                <RouterLink :to="$localePath(`/cameras/${camera.id}`)" class="font-semibold text-[#2768CA]">{{ camera.description }}</RouterLink>
                <span v-if="camera.distance_m !== undefined" class="block">{{ Math.round(camera.distance_m) }} m do ponto crítico</span>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-slate-500">Nenhuma câmera próxima foi informada pela API.</p>
          </div>
        </template>
      </aside>
    </div>

    <div class="mt-5 flex flex-wrap gap-4 text-xs" aria-label="Legenda de evidências">
      <span class="flex items-center gap-2"><i class="h-1 w-6 bg-red-600"></i>Confirmada</span>
      <span class="flex items-center gap-2"><i class="h-1 w-6 bg-orange-600"></i>Observação por câmera</span>
      <span class="flex items-center gap-2"><i class="h-1 w-6 bg-yellow-600"></i>Relato</span>
      <span class="flex items-center gap-2"><i class="h-1 w-6 bg-[#2768CA]"></i>Previsão</span>
    </div>
  </section>
</template>
