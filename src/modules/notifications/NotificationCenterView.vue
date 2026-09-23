<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'
import { useTerritoryCatalog } from '@/modules/addressing'
import OperationalAlertsView from './OperationalAlertsView.vue'
import { notificationsApi } from './api'
import type { NotificationEvent } from './types'

type Tab = 'review' | 'published' | 'new' | 'deliveries'
const tab = ref<Tab>('review')
const events = ref<NotificationEvent[]>([])
const busy = ref(false)
const preview = ref<{ users: number; devices: number } | null>(null)
const territory = useTerritoryCatalog()
const form = reactive({ title: '', message: '', severity: 'ATTENTION', is_global: false, region_ids: [] as string[], neighborhood_ids: [] as string[] })
const neighborhoodSearch = ref('')
const neighborhoodRegion = ref('')
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
const filteredNeighborhoods = computed(() => {
  const terms = normalizeSearch(neighborhoodSearch.value).split(/\s+/).filter(Boolean)
  return territory.neighborhoodsFor(neighborhoodRegion.value)
    .filter((item) => terms.every((term) => normalizeSearch(item.name).includes(term)))
    .slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
})
const selectedNeighborhoods = computed(() => territory.neighborhoods.value.filter((item) => form.neighborhood_ids.includes(item.id)))
const regionName = (id: string | null) => territory.regions.value.find((item) => item.id === id)?.name || 'Sem região vinculada'
function removeNeighborhood(id: string) { form.neighborhood_ids = form.neighborhood_ids.filter((value) => value !== id) }
const visibleEvents = computed(() => events.value.filter((item) => tab.value === 'published' ? item.status === 'PUBLISHED' : true))

async function loadEvents() { events.value = await notificationsApi.listEvents() }
async function prepareManual() {
  busy.value = true; preview.value = null
  try {
    const event = await notificationsApi.createManualEvent({ ...form, region_ids: form.is_global ? [] : [...form.region_ids], neighborhood_ids: form.is_global ? [] : [...form.neighborhood_ids] })
    preview.value = await notificationsApi.previewEvent(event.id)
    if (!window.confirm(`Este comunicado alcançará ${preview.value.users} usuário(s) em ${preview.value.devices} dispositivo(s). Publicar agora?`)) {
      await notificationsApi.cancelEvent(event.id); return
    }
    await notificationsApi.publishEvent(event.id)
    toast.success('Comunicado publicado e entregas agendadas.')
    Object.assign(form, { title: '', message: '', severity: 'ATTENTION', is_global: false, region_ids: [], neighborhood_ids: [] })
    neighborhoodSearch.value = ''; neighborhoodRegion.value = ''
    await loadEvents(); tab.value = 'published'
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível publicar o comunicado.') }
  finally { busy.value = false }
}
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
onMounted(() => Promise.all([territory.load(), loadEvents()]))
</script>

<template>
  <section class="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-0" aria-labelledby="notification-center-title">
    <header class="mb-5 rounded-3xl bg-gradient-to-br from-[#00182F] to-[#0750AF] p-6 text-white"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Administração</p><h1 id="notification-center-title" class="mt-2 text-3xl font-semibold">Central de notificações</h1><p class="mt-2 text-blue-100">Revise detecções, publique comunicados e acompanhe as entregas em um só lugar.</p></header>
    <nav class="mb-5 flex flex-wrap gap-2" aria-label="Seções da central"><button v-for="item in ([['review','Para revisar'],['published','Publicados'],['new','Novo comunicado'],['deliveries','Entregas']] as const)" :key="item[0]" type="button" :class="['rounded-xl px-4 py-2 font-semibold', tab === item[0] ? 'bg-[#2768CA] text-white' : 'border border-slate-300']" @click="tab = item[0]">{{ item[1] }}</button></nav>
    <OperationalAlertsView v-if="tab === 'review'" />
    <form v-else-if="tab === 'new'" class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#001C3B]" @submit.prevent="prepareManual">
      <label class="font-medium">Título<input v-model="form.title" maxlength="160" required class="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3" /></label>
      <label class="font-medium">Mensagem<textarea v-model="form.message" maxlength="1000" required rows="5" class="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3" /></label>
      <label class="font-medium">Severidade<select v-model="form.severity" class="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3"><option value="INFO">Informativo</option><option value="ATTENTION">Atenção</option><option value="CRITICAL">Crítico</option></select></label>
      <fieldset class="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/20">
        <legend class="px-2 font-semibold">Público do comunicado</legend>
        <label class="flex items-start gap-3"><input v-model="form.is_global" type="radio" :value="false" name="audience" class="mt-1" /><span><strong class="block">Por região e bairro</strong><span class="text-sm text-slate-500">Envie para quem acompanha os locais selecionados.</span></span></label>
        <label class="flex items-start gap-3"><input v-model="form.is_global" type="radio" :value="true" name="audience" class="mt-1" /><span><strong class="block">Global · todos os usuários</strong><span class="text-sm text-slate-500">Inclui usuários sem regiões ou bairros cadastrados. O push chega aos dispositivos com notificações ativas.</span></span></label>
      </fieldset>
      <div v-if="!form.is_global" class="grid gap-4 lg:grid-cols-2">
        <label class="font-medium">Regiões<select v-model="form.region_ids" multiple class="mt-1 h-48 w-full rounded-xl border border-slate-300 bg-transparent p-2"><option v-for="item in territory.regions.value" :key="item.id" :value="item.id">{{ item.name }}</option></select><span class="text-sm font-normal text-slate-500">Selecione uma ou mais regiões, bairros ou ambos.</span></label>
        <fieldset class="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-white/20">
          <legend class="px-2 font-semibold">Pesquisar bairros</legend>
          <label for="neighborhood-search" class="text-sm font-medium">Nome do bairro</label>
          <input id="neighborhood-search" v-model="neighborhoodSearch" type="search" placeholder="Digite para buscar, ex.: São José" class="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3" />
          <label for="neighborhood-region" class="mt-3 block text-sm font-medium">Filtrar por região</label>
          <select id="neighborhood-region" v-model="neighborhoodRegion" class="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3"><option value="">Todas as regiões</option><option v-for="item in territory.regions.value" :key="item.id" :value="item.id">{{ item.name }}</option></select>
          <p v-if="territory.loading.value" class="mt-3 text-sm" role="status">Carregando bairros…</p>
          <div v-else-if="territory.error.value" class="mt-3 text-sm" role="alert">{{ territory.error.value }} <button type="button" class="underline" @click="territory.load()">Tentar novamente</button></div>
          <template v-else>
            <p class="my-3 text-sm text-slate-500" role="status">{{ filteredNeighborhoods.length }} bairros encontrados · {{ form.neighborhood_ids.length }} selecionados</p>
            <div class="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/20">
              <label v-for="item in filteredNeighborhoods" :key="item.id" class="flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3 last:border-0 hover:bg-blue-50 dark:border-white/10 dark:hover:bg-white/10"><input v-model="form.neighborhood_ids" type="checkbox" :value="item.id" class="h-4 w-4" /><span><strong class="block text-sm">{{ item.name }}</strong><small class="text-slate-500">{{ regionName(item.regionId) }}</small></span></label>
              <p v-if="!filteredNeighborhoods.length" class="p-4 text-sm text-slate-500">Nenhum bairro encontrado. Tente outro nome ou região.</p>
            </div>
          </template>
          <div v-if="selectedNeighborhoods.length" class="mt-4">
            <div class="flex items-center justify-between gap-2 text-sm"><strong>Bairros selecionados</strong><button type="button" class="underline" @click="form.neighborhood_ids = []">Limpar seleção</button></div>
            <ul class="mt-2 flex flex-wrap gap-2"><li v-for="item in selectedNeighborhoods" :key="item.id"><button type="button" class="rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-white/10 dark:text-blue-200" :aria-label="`Remover ${item.name}`" @click="removeNeighborhood(item.id)">{{ item.name }} ×</button></li></ul>
          </div>
        </fieldset>
      </div>
      <p v-if="preview" role="status">Prévia: {{ preview.users }} usuários e {{ preview.devices }} dispositivos.</p><button :disabled="busy || (!form.is_global && !form.region_ids.length && !form.neighborhood_ids.length)" class="w-fit rounded-xl bg-[#2768CA] px-5 py-3 font-semibold text-white disabled:opacity-50">Revisar alcance e publicar</button>
    </form>
    <div v-else class="grid gap-3">
      <p v-if="!visibleEvents.length" class="rounded-2xl border border-dashed p-8 text-center text-slate-500">Nenhuma notificação encontrada.</p>
      <article v-for="event in visibleEvents" :key="event.id" class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#001C3B]"><div class="flex flex-wrap items-start justify-between gap-3"><div><span class="text-xs font-semibold text-[#2768CA]">{{ event.origin }} · {{ event.severity }} · {{ event.is_global ? 'Global' : 'Por região/bairro' }}</span><h2 class="mt-1 text-lg font-semibold">{{ event.title }}</h2><p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ event.message }}</p></div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-white/10">{{ event.status }}</span></div><div class="mt-4 flex flex-wrap gap-4 text-sm"><span>{{ formatDate(event.published_at || event.created_at) }}</span><span>{{ event.audience_count }} destinatários</span><span>Enviadas: {{ event.delivery_summary.sent }}</span><span>Pendentes: {{ event.delivery_summary.pending }}</span><span>Falhas: {{ event.delivery_summary.failed }}</span><span>Expiradas: {{ event.delivery_summary.expired }}</span></div></article>
    </div>
  </section>
</template>
