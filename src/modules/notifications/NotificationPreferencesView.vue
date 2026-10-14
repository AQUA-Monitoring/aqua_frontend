<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'
import { useTerritoryCatalog } from '@/modules/addressing'
import { notificationsApi } from './api'
import { useNotificationsStore } from './store'
import type { SavedPlace } from './types'
import { useWebPush } from './useWebPush'
import TerritoryFollowPicker from './components/TerritoryFollowPicker.vue'
import type { FollowOption } from './components/TerritoryFollowPicker.vue'

const store = useNotificationsStore()
const webPush = useWebPush()
const territory = useTerritoryCatalog()
const savedPlaces = ref<SavedPlace[]>([])
const territoryAction = ref<string | null>(null)
const territoryMessage = ref('Suas escolhas são salvas automaticamente.')
const territoryError = ref(false)
const loading = ref(true)
const loadError = ref('')
const locating = ref(false)
const busy = ref(false)
const place = reactive({ name: 'Casa', latitude: '', longitude: '', radius_km: 3 })
const followedIds = computed(
  () => new Set(store.regionSubscriptions.flatMap((item) => (item.region ? [item.region.id] : []))),
)
const regionOptions = computed<FollowOption[]>(() => {
  const options: FollowOption[] = territory.regions.value.map((region) => ({
    id: region.id,
    name: region.name,
    detail: region.city ?? '',
    available: true,
  }))
  for (const subscription of store.regionSubscriptions) {
    const region = subscription.region
    if (region && !options.some((option) => option.id === region.id)) {
      options.push({
        id: region.id,
        name: region.name,
        detail: region.city.name,
        available: false,
      })
    }
  }
  return options.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
})
const stateCopy = computed(
  () =>
    ({
      unsupported: ['Navegador incompatível', 'Este dispositivo não oferece suporte a Web Push.'],
      disabled_by_server: [
        'Indisponível no momento',
        'O envio de push não está habilitado neste ambiente.',
      ],
      prompt: [
        'Notificações desativadas',
        'Ative para receber alertas dos territórios e locais salvos.',
      ],
      denied: [
        'Permissão bloqueada',
        'Libere notificações nas configurações do navegador para continuar.',
      ],
      subscribing: ['Atualizando…', 'Aguarde enquanto configuramos este dispositivo.'],
      subscribed: [
        'Notificações ativas',
        'Este dispositivo pode receber seus alertas territoriais.',
      ],
      temporary_error: ['Falha temporária', webPush.error.value ?? 'Tente novamente em instantes.'],
    })[webPush.state.value],
)

async function load() {
  loading.value = true
  loadError.value = ''
  void webPush.refresh()
  try {
    const [, places] = await Promise.all([
      store.loadRegionSubscriptions(),
      notificationsApi.listSavedPlaces(),
      territory.load(),
    ])
    savedPlaces.value = places
    if (territory.error.value) loadError.value = territory.error.value
  } catch {
    loadError.value = 'Não foi possível carregar suas preferências. Tente novamente.'
  } finally {
    loading.value = false
  }
}
async function updateTerritories(
  actionId: string,
  action: () => Promise<unknown>,
  message: string,
) {
  if (territoryAction.value) return
  territoryAction.value = actionId
  territoryError.value = false
  territoryMessage.value = 'Salvando suas escolhas…'
  try {
    await action()
    await store.loadRegionSubscriptions()
    territoryMessage.value = message
  } catch {
    territoryError.value = true
    territoryMessage.value = 'Não foi possível confirmar a alteração. Tente novamente.'
  } finally {
    territoryAction.value = null
  }
}
function toggleRegion(id: string) {
  const followed = followedIds.value.has(id)
  const name = regionOptions.value.find((region) => region.id === id)?.name ?? 'Região'
  return updateTerritories(
    `region:${id}`,
    () => (followed ? notificationsApi.unfollowRegion(id) : notificationsApi.followRegion(id)),
    followed ? `Você deixou de acompanhar ${name}.` : `Agora você acompanha ${name}.`,
  )
}
function followAllRegions() {
  return updateTerritories(
    'all',
    () => notificationsApi.followAllRegions(),
    'Você está acompanhando todas as regiões disponíveis.',
  )
}
function useCurrentLocation() {
  if (!navigator.geolocation) {
    toast.error('Localização indisponível neste navegador. Informe as coordenadas.')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      place.latitude = String(coords.latitude)
      place.longitude = String(coords.longitude)
      locating.value = false
      toast.success('Localização preenchida. Confira os dados e salve o local.')
    },
    () => {
      locating.value = false
      toast.error('Não foi possível obter sua localização. Informe as coordenadas abaixo.')
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}
async function savePlace() {
  busy.value = true
  try {
    await notificationsApi.createSavedPlace({
      name: place.name,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      radius_km: place.radius_km,
    })
    savedPlaces.value = await notificationsApi.listSavedPlaces()
    place.latitude = ''
    place.longitude = ''
    toast.success('Local salvo para alertas próximos.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o local.')
  } finally {
    busy.value = false
  }
}
async function removePlace(id: string) {
  busy.value = true
  try {
    await notificationsApi.deleteSavedPlace(id)
    savedPlaces.value = savedPlaces.value.filter((item) => item.id !== id)
  } catch {
    toast.error('Não foi possível excluir o local.')
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="preferences" aria-labelledby="notifications-title">
    <header class="page-heading">
      <p class="eyebrow">SUAS PREFERÊNCIAS</p>
      <h1 id="notifications-title">Alertas perto de você</h1>
      <p>Escolha onde acompanhar os alertas e como recebê-los neste dispositivo.</p>
    </header>

    <article
      class="device-card"
      :class="{ 'is-active': webPush.active.value }"
      aria-labelledby="device-title"
    >
      <div class="device-icon" aria-hidden="true">
        <span class="material-symbols-outlined">{{
          webPush.active.value ? 'notifications_active' : 'notifications'
        }}</span>
      </div>
      <div class="device-content">
        <p class="eyebrow">NESTE DISPOSITIVO</p>
        <h2 id="device-title" aria-live="polite">{{ stateCopy[0] }}</h2>
        <p>{{ stateCopy[1] }}</p>
        <p
          v-if="webPush.error.value && webPush.state.value !== 'temporary_error'"
          class="error-text"
          role="alert"
        >
          {{ webPush.error.value }}
        </p>
      </div>
      <button
        v-if="webPush.state.value === 'prompt' || webPush.state.value === 'temporary_error'"
        type="button"
        class="button primary device-action"
        @click="webPush.subscribe"
      >
        {{ webPush.state.value === 'temporary_error' ? 'Tentar novamente' : 'Ativar notificações' }}
      </button>
      <button
        v-else-if="webPush.active.value"
        type="button"
        class="button secondary device-action"
        @click="webPush.unsubscribe"
      >
        Desativar
      </button>
      <button
        v-else-if="webPush.state.value === 'denied'"
        type="button"
        class="button secondary device-action"
        @click="webPush.refresh"
      >
        Já liberei a permissão
      </button>
      <span v-else-if="webPush.state.value === 'subscribing'" class="status-pill" role="status"
        >Configurando…</span
      >
    </article>

    <div v-if="loading" class="feedback" role="status">Carregando suas preferências…</div>
    <div v-else-if="loadError" class="feedback" role="alert">
      <p>{{ loadError }}</p>
      <button class="button secondary" type="button" @click="load">Tentar novamente</button>
    </div>
    <template v-else>
      <section aria-labelledby="territories-title" class="section-block">
        <div class="section-heading">
          <div>
            <h2 id="territories-title">Onde você quer acompanhar?</h2>
            <p>Pesquise e marque as regiões que você quer acompanhar.</p>
          </div>
        </div>
        <div class="territory-grid">
          <TerritoryFollowPicker
            :options="regionOptions"
            :followed-ids="followedIds"
            :busy="territoryAction !== null"
            :action-id="territoryAction"
            @toggle="toggleRegion"
            @follow-all="followAllRegions"
          />
        </div>
        <p
          class="preference-feedback"
          :class="{ 'error-text': territoryError }"
          :role="territoryError ? 'alert' : 'status'"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{
            territoryError ? 'error' : territoryAction ? 'sync' : 'check_circle'
          }}</span>
          {{ territoryMessage }}
        </p>
      </section>

      <section class="section-block" aria-labelledby="places-title">
        <div class="section-heading">
          <div>
            <h2 id="places-title">Seus locais importantes</h2>
            <p>Receba alertas próximos de casa, do trabalho ou de outro endereço.</p>
          </div>
          <span class="count"
            >{{ savedPlaces.length }} {{ savedPlaces.length === 1 ? 'local' : 'locais' }}</span
          >
        </div>
        <article class="card">
          <form class="place-form" @submit.prevent="savePlace">
            <div class="location-intro">
              <div>
                <h3>Adicionar um local</h3>
                <p class="supporting">Use sua localização ou preencha as coordenadas abaixo.</p>
              </div>
              <button
                type="button"
                class="button secondary"
                :disabled="locating || busy"
                @click="useCurrentLocation"
              >
                <span class="material-symbols-outlined" aria-hidden="true">my_location</span
                >{{ locating ? 'Obtendo localização…' : 'Usar minha localização' }}
              </button>
            </div>
            <div class="place-fields">
              <label class="field"
                >Nome do local<input
                  v-model="place.name"
                  maxlength="80"
                  placeholder="Ex.: Casa ou trabalho"
                  required
              /></label>
              <div class="field">
                <label for="place-radius" class="range-label"
                  >Distância para alertas
                  <output for="place-radius">{{ place.radius_km }} km</output></label
                ><input
                  id="place-radius"
                  v-model.number="place.radius_km"
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  :aria-valuetext="`${place.radius_km} quilômetros`"
                />
                <div class="range-limits" aria-hidden="true">
                  <span>1 km</span><span>10 km</span>
                </div>
              </div>
              <label class="field"
                >Latitude<input
                  v-model="place.latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  placeholder="Ex.: -26.30"
                  required
              /></label>
              <label class="field"
                >Longitude<input
                  v-model="place.longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  placeholder="Ex.: -48.84"
                  required
              /></label>
            </div>
            <footer class="form-footer">
              <p>
                <span class="material-symbols-outlined" aria-hidden="true">lock</span>As coordenadas
                são privadas. Não acompanhamos seus deslocamentos.
              </p>
              <button
                class="button primary"
                :disabled="
                  busy || locating || !place.name.trim() || !place.latitude || !place.longitude
                "
              >
                {{ busy ? 'Aguarde…' : 'Salvar local' }}
              </button>
            </footer>
          </form>
          <ul v-if="savedPlaces.length" class="saved-list places-list">
            <li v-for="item in savedPlaces" :key="item.id">
              <div class="item-copy">
                <strong
                  >{{ item.name }} <span class="distance">{{ item.radius_km }} km</span></strong
                ><small>{{
                  [item.territory.neighborhood, item.territory.region, item.territory.city]
                    .filter(Boolean)
                    .join(' · ') || 'Local definido pelas coordenadas'
                }}</small>
              </div>
              <button
                type="button"
                class="remove-button"
                :aria-label="`Excluir local ${item.name}`"
                :disabled="busy"
                @click="removePlace(item.id)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
              </button>
            </li>
          </ul>
          <p v-else class="empty-state">Seus locais salvos aparecerão aqui.</p>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.preferences {
  --line: #e2e8f0;
  --muted: #52627a;
  --surface: #fff;
  color: #172b46;
  width: 100%;
  min-width: 0;
  padding: 24px 0 24px;
}
.page-heading {
  margin-bottom: 24px;
}
.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #2768ca;
  margin-bottom: 8px;
}
h1 {
  font-size: clamp(1.6rem, 3vw, 2.15rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
}
h2 {
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.4;
}
h3 {
  font-size: 1rem;
  font-weight: 650;
}
.page-heading > p:last-child,
.section-heading p,
.device-content > p:not(.eyebrow),
.supporting {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
  margin-top: 6px;
}
.device-card {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  padding: 22px;
  border: 1px solid #bfd3f3;
  background: #f0f6ff;
  border-radius: 20px;
}
.device-card.is-active {
  border-color: #b4dfcd;
  background: #f0faf5;
}
.device-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #fff;
  color: #2768ca;
  flex-shrink: 0;
}
.device-content {
  flex: 1;
  min-width: 180px;
}
.device-content .eyebrow {
  margin-bottom: 4px;
}
.device-action {
  align-self: center;
}
.button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.4;
  transition: background 0.15s;
}
.primary {
  background: #245fbb;
  color: #fff;
  border: 1px solid #245fbb;
}
.primary:hover:not(:disabled) {
  background: #1c4e9c;
}
.secondary {
  border: 1px solid #b4c5df;
  background: var(--surface);
  color: #245fbb;
}
.secondary:hover:not(:disabled) {
  background: #e6effc;
}
button:disabled,
select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #75a7f3;
  outline-offset: 3px;
}
.section-block {
  margin-top: 32px;
}
.section-heading,
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.section-heading > div {
  min-width: 0;
}
.card-heading {
  margin-bottom: 4px;
}
.count,
.status-pill {
  flex-shrink: 0;
  border-radius: 99px;
  padding: 4px 10px;
  background: #edf2f8;
  color: #465d78;
  font-size: 12px;
  font-weight: 600;
}
.preference-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.preference-feedback .material-symbols-outlined {
  font-size: 18px;
  flex-shrink: 0;
}
.territory-grid {
  width: 100%;
  min-width: 0;
}
.card {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}
.territory-form {
  margin-top: 20px;
}
.territory-form label,
.field {
  font-size: 13px;
  font-weight: 600;
}
.input-action {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
input:not([type='range']),
select {
  min-height: 46px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid #bdcadb;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 400;
}
.input-action select {
  flex: 1 1 160px;
  width: 0;
}
.saved-list {
  margin-top: 20px;
  display: grid;
  gap: 8px;
}
.saved-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f5f7fb;
  border-radius: 12px;
}
.item-copy {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.item-copy strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
}
.item-copy small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-top: 3px;
}
.remove-button {
  width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  color: #a13240;
  border-radius: 10px;
  flex-shrink: 0;
  cursor: pointer;
}
.remove-button:hover {
  background: #ffe7e9;
}
.empty-state {
  margin-top: 20px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.location-intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.place-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.range-label,
.range-limits {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.range-label output,
.distance {
  color: #245fbb;
  background: #eaf2ff;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 12px;
  white-space: nowrap;
}
input[type='range'] {
  accent-color: #2768ca;
  width: 100%;
  height: 24px;
}
.range-limits {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}
.form-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.form-footer p {
  flex: 1 1 220px;
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}
.form-footer p .material-symbols-outlined {
  font-size: 18px;
}
.places-list {
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.feedback {
  padding: 24px;
  margin-top: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  display: grid;
  gap: 12px;
}
.error-text {
  color: #b42336 !important;
}
@media (min-width: 640px) {
  .place-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 479px) {
  .device-card,
  .card {
    padding: 16px;
  }
  .device-action,
  .location-intro > button,
  .form-footer > button {
    width: 100%;
  }
  .input-action {
    flex-direction: column;
  }
  .input-action select {
    width: 100%;
    flex-basis: auto;
  }
  .section-heading {
    align-items: flex-start;
  }
}
:global(.dark) .preferences {
  --line: #314760;
  --muted: #b3c3d7;
  --surface: #102b47;
  color: #eef4ff;
}
:global(.dark) .device-card {
  background: #112f53;
  border-color: #345780;
}
:global(.dark) .device-card.is-active {
  background: #143b35;
  border-color: #2c6555;
}
:global(.dark) .device-icon,
:global(.dark) .saved-list li,
:global(.dark) .count {
  background: #203c58;
  color: #d3e5ff;
}
:global(.dark) .eyebrow,
:global(.dark) .secondary {
  color: #9dc5ff;
}
:global(.dark) .error-text {
  color: #ffadb6 !important;
}
</style>
