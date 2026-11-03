<script setup lang="ts">
import { formatLocale } from '@/app/i18n'
import { evidenceLabels, formatDate, formatLength, statusLabels } from '../presentation'
import type { FloodHotspot, FloodHotspotHistoryItem, PageState } from '../types/floodImpact'
import FloodImpactPagination from './FloodImpactPagination.vue'

defineProps<{
  hotspots: FloodHotspot[]
  selected: FloodHotspot | null
  history: FloodHotspotHistoryItem[]
  page: PageState
  historyPage: PageState
  loading: boolean
  refreshing: boolean
  error: string | null
  historyLoading: boolean
  historyError: string | null
}>()

const emit = defineEmits<{
  select: [hotspot: FloodHotspot]
  retry: []
  retryHistory: []
  page: [page: number]
  historyPage: [page: number]
}>()
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#071F36]" aria-labelledby="recurrence-title">
    <div class="flex items-center justify-between gap-2">
      <div><h2 id="recurrence-title" class="font-semibold">Recorrência territorial</h2><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Agrupamentos históricos, não previsão de bloqueio.</p></div>
      <span v-if="refreshing" class="text-xs text-slate-500" role="status">Atualizando…</span>
    </div>
    <div v-if="loading" class="mt-4 h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" role="status" aria-label="Carregando recorrência"></div>
    <div v-else-if="error" class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
      <p>{{ error }}</p><button type="button" class="mt-2 font-semibold text-[#2768CA] underline" @click="emit('retry')">Tentar novamente</button>
    </div>
    <p v-else-if="hotspots.length === 0" class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800">Nenhuma recorrência encontrada para os filtros.</p>
    <div v-else class="mt-4 max-h-[24rem] space-y-2 overflow-auto">
      <button v-for="hotspot in hotspots" :key="hotspot.id" type="button" class="w-full rounded-xl border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]" :class="selected?.id === hotspot.id ? 'border-[#2768CA] bg-blue-50 text-slate-950' : 'border-slate-200 dark:border-slate-700'" :aria-pressed="selected?.id === hotspot.id" @click="emit('select', hotspot)">
        <span class="font-semibold">{{ hotspot.name || hotspot.spatial_unit }}</span>
        <span class="mt-1 block">{{ hotspot.event_count }} evento(s) · {{ formatLength(hotspot.affected_length_m) }}</span>
        <span class="mt-1 block text-xs text-slate-500">Índice {{ hotspot.recurrence_score.toLocaleString(formatLocale()) }} · {{ hotspot.confirmed_event_count }} confirmado(s)</span>
      </button>
    </div>
    <FloodImpactPagination class="mt-3" :page="page" :disabled="loading || refreshing" label="Paginação de recorrências" @change="emit('page', $event)" />

    <div v-if="selected" class="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
      <h3 class="font-semibold">Histórico de {{ selected.name || selected.spatial_unit }}</h3>
      <p class="mt-1 text-xs text-slate-500">Período agregado: {{ formatDate(selected.period_start) }} — {{ formatDate(selected.period_end) }}</p>
      <p v-if="historyLoading" class="mt-3 text-sm" role="status">Carregando registros…</p>
      <div v-else-if="historyError" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950" role="alert"><p>{{ historyError }}</p><button type="button" class="mt-2 font-semibold text-[#2768CA] underline" @click="emit('retryHistory')">Tentar novamente</button></div>
      <p v-else-if="history.length === 0" class="mt-3 text-sm text-slate-500">Nenhum registro histórico retornado.</p>
      <ol v-else class="mt-3 space-y-2 text-sm">
        <li v-for="record in history" :key="record.id" class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p class="font-semibold">{{ evidenceLabels[record.evidence_kind] }} · {{ statusLabels[record.status] }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ formatDate(record.valid_from) }} · {{ formatLength(record.affected_length_m ?? 0) }}</p>
        </li>
      </ol>
      <FloodImpactPagination class="mt-3" :page="historyPage" :disabled="historyLoading" label="Paginação do histórico da recorrência" @change="emit('historyPage', $event)" />
      <div v-if="selected.nearby_cameras?.length" class="mt-4">
        <h3 class="font-semibold">Câmeras próximas para inspeção</h3>
        <ul class="mt-2 space-y-2 text-sm">
          <li v-for="camera in selected.nearby_cameras" :key="camera.id" class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <RouterLink :to="$localePath(`/cameras/${camera.id}`)" class="font-semibold text-[#2768CA] underline-offset-2 hover:underline">{{ camera.description }}</RouterLink>
            <span v-if="camera.distance_m !== undefined" class="block text-xs text-slate-500">{{ Math.round(camera.distance_m) }} m do agrupamento</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
