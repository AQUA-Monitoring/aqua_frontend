<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'

const TerritoryAudiencePicker = defineAsyncComponent(() => import('./TerritoryAudiencePicker.vue'))
const showMap = ref(true)
export interface FollowOption {
  id: string
  name: string
  detail: string
  available: boolean
}

const props = defineProps<{
  options: FollowOption[]
  followedIds: Set<string>
  busy: boolean
  actionId: string | null
}>()
const emit = defineEmits<{ toggle: [id: string]; followAll: [] }>()
const query = ref('')
const followingOnly = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const count = computed(() => props.options.filter((item) => props.followedIds.has(item.id)).length)
const available = computed(() => props.options.filter((item) => item.available))
const allFollowed = computed(
  () =>
    available.value.length > 0 && available.value.every((item) => props.followedIds.has(item.id)),
)
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
const visibleOptions = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  return props.options.filter((item) => {
    const matchesSearch = terms.every((term) =>
      normalize(`${item.name} ${item.detail}`).includes(term),
    )
    return matchesSearch && (!followingOnly.value || props.followedIds.has(item.id))
  })
})
const mapRegions = computed(() =>
  available.value.map((item) => ({
    id: item.id,
    name: item.name,
    city: item.detail,
    regionId: null,
  })),
)
function selectOnMap(value: { regionIds: string[]; neighborhoodIds: string[] }) {
  if (props.busy) return
  const changed = available.value.find(
    (item) => props.followedIds.has(item.id) !== value.regionIds.includes(item.id),
  )
  if (changed) emit('toggle', changed.id)
}
function clearSearch() {
  query.value = ''
  searchInput.value?.focus()
}
function toggle(event: Event, id: string) {
  // Keep the checkbox aligned with saved state while the request is in flight.
  ;(event.target as HTMLInputElement).checked = props.followedIds.has(id)
  emit('toggle', id)
}
</script>

<template>
  <article class="territory-picker" aria-labelledby="region-title" :aria-busy="busy">
    <header class="picker-heading">
      <div class="heading-icon" aria-hidden="true">
        <span class="material-symbols-outlined">map</span>
      </div>
      <div>
        <h3 id="region-title">Regiões acompanhadas</h3>
        <p>Escolha uma ou mais regiões para receber alertas.</p>
      </div>
      <span class="selection-count" :aria-label="`${count} regiões selecionadas`">{{ count }}</span>
    </header>

    <div class="all-regions" :class="{ complete: allFollowed }">
      <div>
        <strong>{{
          allFollowed ? 'Todas as regiões acompanhadas' : 'Quer acompanhar todas?'
        }}</strong>
        <p>Inclui as {{ available.length }} regiões disponíveis. Você pode desmarcar depois.</p>
      </div>
      <button
        type="button"
        class="follow-all"
        :disabled="busy || allFollowed || !available.length"
        @click="emit('followAll')"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{{
          allFollowed ? 'done_all' : 'add'
        }}</span>
        {{
          actionId === 'all' ? 'Salvando…' : allFollowed ? 'Todas acompanhadas' : 'Acompanhar todas'
        }}
      </button>
    </div>

    <section class="region-map-section" aria-label="Selecionar regiões pelo mapa">
      <button
        type="button"
        class="map-toggle"
        :aria-expanded="showMap"
        aria-controls="region-map"
        @click="showMap = !showMap"
      >
        <span class="material-symbols-outlined" aria-hidden="true">map</span>
        {{ showMap ? 'Esconder mapa' : 'Selecionar pelo mapa' }}
        <span class="material-symbols-outlined" aria-hidden="true">{{
          showMap ? 'expand_less' : 'expand_more'
        }}</span>
      </button>
      <div v-if="showMap" id="region-map">
        <TerritoryAudiencePicker
          :regions="mapRegions"
          :neighborhoods="[]"
          :region-ids="[...followedIds]"
          :neighborhood-ids="[]"
          regions-only
          map-only
          :disabled="busy"
          @change="selectOnMap"
        />
      </div>
    </section>
    <div class="picker-toolbar">
      <div class="search-field">
        <label for="region-search" class="sr-only">Pesquisar regiões</label>
        <span class="material-symbols-outlined" aria-hidden="true">search</span>
        <input
          id="region-search"
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="Pesquisar regiões…"
          autocomplete="off"
          aria-controls="region-options"
          @keydown.esc="clearSearch"
        />
        <button
          v-if="query"
          type="button"
          class="clear-search"
          aria-label="Limpar pesquisa"
          @click="clearSearch"
        >
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="list-filters" aria-label="Filtrar regiões" role="group">
        <button type="button" :aria-pressed="!followingOnly" @click="followingOnly = false">
          Todas
        </button>
        <button type="button" :aria-pressed="followingOnly" @click="followingOnly = true">
          Acompanhando <span>{{ count }}</span>
        </button>
      </div>
    </div>

    <p class="result-count" role="status">
      {{ visibleOptions.length }} {{ visibleOptions.length === 1 ? 'resultado' : 'resultados' }}
      <span v-if="query"> para “{{ query }}”</span>
    </p>
    <ul v-if="visibleOptions.length" id="region-options" class="territory-options">
      <li v-for="item in visibleOptions" :key="item.id">
        <label
          class="territory-option"
          :class="{ selected: followedIds.has(item.id), saving: actionId === `region:${item.id}` }"
        >
          <input
            type="checkbox"
            :checked="followedIds.has(item.id)"
            :disabled="busy"
            :aria-label="`${followedIds.has(item.id) ? 'Deixar de acompanhar' : 'Acompanhar'} ${item.name}`"
            @change="toggle($event, item.id)"
          />
          <span class="option-copy">
            <strong>{{ item.name }}</strong>
            <small v-if="item.detail">{{ item.detail }}</small>
            <small v-if="!item.available">Fora do catálogo atual</small>
          </span>
          <span v-if="actionId === `region:${item.id}`" class="option-status">Salvando…</span>
          <span
            v-else-if="followedIds.has(item.id)"
            class="material-symbols-outlined selected-icon"
            aria-hidden="true"
            >check_circle</span
          >
        </label>
      </li>
    </ul>
    <div v-else id="region-options" class="picker-empty">
      <span class="material-symbols-outlined" aria-hidden="true">{{
        query ? 'search_off' : 'location_on'
      }}</span>
      <strong>{{
        query
          ? 'Nenhum resultado encontrado'
          : followingOnly
            ? 'Sua seleção começa aqui'
            : 'Nenhuma opção disponível'
      }}</strong>
      <p>
        {{
          query
            ? 'Tente outro nome ou confira a escrita.'
            : followingOnly
              ? 'Abra “Todas” para escolher as regiões que deseja acompanhar.'
              : 'As regiões cadastradas aparecerão nesta lista.'
        }}
      </p>
      <button v-if="query" type="button" @click="clearSearch">Limpar pesquisa</button>
      <button v-else-if="followingOnly" type="button" @click="followingOnly = false">
        Explorar regiões
      </button>
    </div>
  </article>
</template>

<style scoped>
.region-map-section {
  margin: 20px 0;
}
.map-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: #245fbb;
  font-weight: 600;
  margin-bottom: 8px;
}
:global(.dark) .map-toggle {
  color: #93c5fd;
}

.territory-picker {
  container: region-picker / inline-size;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 18px;
  background: var(--surface, #fff);
}
.picker-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.picker-heading > div:nth-child(2) {
  flex: 1;
  min-width: 0;
}
.heading-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #edf4ff;
  color: #245fbb;
}
h3 {
  font-size: 17px;
  font-weight: 650;
}
.picker-heading p {
  margin-top: 3px;
  color: var(--muted, #52627a);
  font-size: 13px;
  line-height: 1.5;
}
.selection-count {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 99px;
  background: #edf4ff;
  color: #245fbb;
  font-weight: 700;
  font-size: 13px;
}
.all-regions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 12px;
  background: #f0f6ff;
  border: 1px solid #d7e5fb;
}
.all-regions > div {
  flex: 1 1 190px;
}
.all-regions strong {
  display: block;
  font-size: 14px;
}
.all-regions p {
  color: var(--muted, #52627a);
  font-size: 12px;
  line-height: 1.6;
  margin-top: 5px;
}
.follow-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 9px;
  background: #245fbb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.follow-all .material-symbols-outlined {
  font-size: 20px;
}
.complete {
  background: #f0faf5;
  border-color: #bee1cf;
}
.complete .follow-all {
  background: #e0f1e7;
  color: #216243;
  opacity: 1;
}
.picker-toolbar {
  display: grid;
  gap: 12px;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border: 1px solid #bdcadb;
  border-radius: 10px;
  padding: 0 12px;
}
.search-field > .material-symbols-outlined {
  font-size: 21px;
  color: #697d97;
}
.search-field:focus-within {
  outline: 3px solid #b7d1ff;
  border-color: #245fbb;
  outline-offset: 2px;
}
.search-field input {
  width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 44px;
  background: transparent;
  font-size: 16px;
  outline: none;
}
.search-field input::-webkit-search-cancel-button {
  display: none;
}
.clear-search {
  display: grid;
  place-items: center;
  min-width: 36px;
  min-height: 44px;
  color: var(--muted, #52627a);
}
.list-filters {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-top: 0;
  border-radius: 10px;
  background: #f2f5f9;
}
.list-filters button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 6px;
  min-height: 40px;
  padding: 8px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted, #52627a);
  border-radius: 7px;
}
.list-filters button[aria-pressed='true'] {
  color: #245fbb;
  background: var(--surface, #fff);
  box-shadow: 0 1px 3px #172b4614;
}
.list-filters span {
  padding: 1px 5px;
  border-radius: 5px;
  background: #e6edf8;
  font-size: 11px;
}
.result-count {
  color: var(--muted, #52627a);
  font-size: 12px;
  margin: 16px 0 10px;
  overflow-wrap: anywhere;
}
.territory-options {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 3px;
  margin: -3px;
}
.territory-option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
}
.territory-option:hover {
  background: #f5f8fc;
}
.territory-option.selected {
  border-color: #cbdcf5;
  background: #f0f6ff;
}
.territory-option input {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  accent-color: #245fbb;
  cursor: pointer;
}
.option-copy {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.option-copy strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
}
.option-copy small {
  display: block;
  color: var(--muted, #52627a);
  font-size: 12px;
  margin-top: 3px;
}
.selected-icon {
  font-size: 19px;
  color: #245fbb;
}
.option-status {
  color: #245fbb;
  font-size: 11px;
}
.saving {
  opacity: 0.65;
}
.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  padding: 24px 12px;
  text-align: center;
}
.picker-empty > span {
  color: #90a5be;
  font-size: 30px;
}
.picker-empty strong {
  font-size: 14px;
}
.picker-empty p {
  color: var(--muted, #52627a);
  font-size: 13px;
  max-width: 240px;
  line-height: 1.5;
}
.picker-empty button {
  min-height: 44px;
  color: #245fbb;
  font-size: 13px;
  font-weight: 600;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
  opacity: 0.6;
}
button:focus-visible,
.territory-option input:focus-visible {
  outline: 3px solid #75a7f3;
  outline-offset: 3px;
}
@container region-picker (min-width: 560px) {
  .follow-all {
    width: auto;
  }
  .picker-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
  .list-filters button {
    padding-inline: 14px;
  }
  .territory-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container region-picker (min-width: 900px) {
  .territory-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 479px) {
  .territory-picker {
    padding: 16px;
  }
}
:global(.dark) .heading-icon,
:global(.dark) .selection-count,
:global(.dark) .list-filters {
  background: #203c58;
  color: #aed0ff;
}
:global(.dark) .all-regions,
:global(.dark) .territory-option.selected {
  background: #163754;
  border-color: #3e6084;
}
:global(.dark) .complete {
  background: #143b35;
  border-color: #2c6555;
}
:global(.dark) .complete .follow-all {
  background: #245349;
  color: #b6ead5;
}
:global(.dark) .search-field {
  border-color: #526985;
}
:global(.dark) .territory-option:hover {
  background: #203c58;
}
:global(.dark) .selected-icon,
:global(.dark) .option-status,
:global(.dark) .picker-empty button,
:global(.dark) .list-filters button[aria-pressed='true'] {
  color: #aed0ff;
}
:global(.dark) .list-filters span {
  background: #294561;
}
</style>
