<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import api from '@/app/plugins/axios'

const props = defineProps<{ cameraId: string }>()
interface Run {
  id: string; started_at: string; level: string; model_version: string; error_code: string
  frames: Array<{ normal: number; medium: number; flooded: number }>
  evidence: Array<{ id: string; url: string; sha256: string; preserved: boolean; expires_at: string }>
}
interface Monitoring {
  interval_seconds: number
  next_analysis_at: string
  delay_seconds: number
  scheduling_status: 'SCHEDULED' | 'DUE' | 'QUEUED' | 'RUNNING' | 'WAITING_CAPACITY'
  trend: { status: 'RISING' | 'STABLE' | 'INSUFFICIENT_DATA'; values: number[] }
}
interface Capacity {
  status: 'NORMAL' | 'LIMITED' | 'SUSPENDED' | 'WARMUP' | 'UNAVAILABLE' | 'DISABLED'
}
const monitoring = ref<Monitoring | null>(null)
const capacity = ref<Capacity | null>(null)
const schedulingLabels: Record<Monitoring['scheduling_status'], string> = {
  SCHEDULED: 'Próxima análise prevista', DUE: 'Aguardando despacho',
  QUEUED: 'Análise na fila', RUNNING: 'Análise em andamento',
  WAITING_CAPACITY: 'Aguardando capacidade',
}
const capacityLabels: Record<Capacity['status'], string> = {
  NORMAL: 'Capacidade disponível', LIMITED: 'Ritmo reduzido por carga do servidor',
  SUSPENDED: 'Novas análises temporariamente suspensas por carga do servidor',
  WARMUP: 'Avaliando capacidade do servidor', UNAVAILABLE: 'Medição de capacidade indisponível; ritmo limitado',
  DISABLED: 'Controle de capacidade desativado',
}
const trendLabel = computed(() => monitoring.value?.trend.status === 'RISING'
  ? 'Crescimento sustentado do índice'
  : monitoring.value?.trend.status === 'STABLE'
    ? 'Sem crescimento sustentado nas últimas análises'
    : 'Aguardando análises válidas para avaliar a tendência')
const runs = ref<Run[]>([])
const savedOnly = ref(false)
const page = ref(1)
const total = ref(0)
const level = ref('WATCH')
const currentLevel = ref('NORMAL')
const levelLabels: Record<string, string> = {
  NORMAL: 'Normal', WATCH: 'Observação', CRITICAL: 'Crítico', RECOVERY: 'Recuperação',
}
const reason = ref('')
const error = ref('')
const busy = ref(false)
const preview = ref('')
const selectedRun = ref('')
const classification = ref('FLOOD_INDICATION')
let requestId = 0

async function load() {
  const id = ++requestId
  error.value = ''
  try {
    const { data } = await api.get(`/flood_monitoring/cameras/${props.cameraId}/monitoring/`, { params: { saved: savedOnly.value, page: page.value } })
    if (id !== requestId) return
    runs.value = data.runs
    total.value = data.count
    currentLevel.value = data.monitoring?.level ?? 'NORMAL'
    monitoring.value = data.monitoring?.interval_seconds ? data.monitoring : null
    capacity.value = data.capacity ?? null
  } catch {
    if (id === requestId) error.value = 'Não foi possível carregar o histórico de monitoramento.'
  }
}
async function changeIntensity() {
  if (!reason.value.trim()) return
  busy.value = true
  try {
    await api.post(`/flood_monitoring/cameras/${props.cameraId}/monitoring/`, {
      level: level.value, reason: reason.value, minutes: 60,
    })
    await load()
  } catch { error.value = 'Não foi possível alterar a intensidade.' }
  finally { busy.value = false }
}
async function review() {
  if (!selectedRun.value || !reason.value.trim()) return
  busy.value = true
  try {
    await api.post(`/flood_monitoring/analyses/${selectedRun.value}/reviews/`, {
      classification: classification.value, reason: reason.value,
    })
    selectedRun.value = ''
    await load()
  } catch { error.value = 'Não foi possível registrar a revisão.' }
  finally { busy.value = false }
}
async function preserveEvidence(item: Run['evidence'][number]) {
  const keep = !item.preserved
  if (!keep && !window.confirm('Ao deixar de guardar, imagens com mais de 15 dias serão apagadas na próxima limpeza. Continuar?')) return
  busy.value = true
  try {
    const { data } = await api.patch(`/flood_monitoring/evidence/${item.id}/`, { preserved: keep })
    item.preserved = data.preserved
  } catch { error.value = 'Não foi possível alterar a preservação da imagem.' }
  finally { busy.value = false }
}
async function showEvidence(url: string) {
  const id = requestId
  try {
    const response = await api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
    if (id !== requestId) return
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = URL.createObjectURL(response.data)
  } catch { error.value = 'Imagem indisponível ou link expirado. Atualize o histórico.' }
}
watch(() => props.cameraId, () => {
  runs.value = []; selectedRun.value = ''; page.value = 1
  monitoring.value = null; capacity.value = null
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
  void load()
}, { immediate: true })
onBeforeUnmount(() => { ++requestId; if (preview.value) URL.revokeObjectURL(preview.value) })
</script>

<template>
  <section class="mt-5 space-y-3 rounded-2xl border border-slate-300 p-4 dark:border-slate-700">
    <h3 class="font-semibold">Monitoramento operacional · {{ levelLabels[currentLevel] ?? currentLevel }}</h3>
    <div v-if="monitoring" class="space-y-1 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800" aria-live="polite">
      <p class="font-medium">{{ schedulingLabels[monitoring.scheduling_status] }}</p>
      <p>Intervalo previsto: {{ monitoring.interval_seconds / 60 }} min após a conclusão.</p>
      <p>Próxima análise prevista: {{ new Date(monitoring.next_analysis_at).toLocaleString('pt-BR') }}</p>
      <p v-if="monitoring.delay_seconds > 0 && ['DUE', 'WAITING_CAPACITY'].includes(monitoring.scheduling_status)">
        Atraso no agendamento: {{ Math.ceil(monitoring.delay_seconds) }} s.
      </p>
      <p>{{ trendLabel }}</p>
      <p v-if="monitoring.trend.values.length">Índice nas últimas análises: {{ monitoring.trend.values.map(value => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`).join(' → ') }}.</p>
      <p class="text-xs">O índice é uma estimativa do modelo, não uma medida da altura da água. Os horários dependem da capacidade disponível.</p>
      <p v-if="capacity">{{ capacityLabels[capacity.status] }}</p>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <label class="block text-sm">Justificativa
      <textarea v-model="reason" class="mt-1 w-full rounded border p-2 dark:bg-slate-900" maxlength="500" />
    </label>
    <div class="flex flex-wrap gap-2">
      <select v-model="level" aria-label="Intensidade" class="rounded border p-2 dark:bg-slate-900">
        <option value="NORMAL">Normal</option><option value="WATCH">Observação</option>
        <option value="CRITICAL">Crítico</option><option value="RECOVERY">Recuperação</option>
      </select>
      <button :disabled="busy || !reason.trim()" class="rounded bg-blue-700 p-2 text-white disabled:opacity-50" @click="changeIntensity">Aplicar por 1 hora</button>
      <button class="rounded border p-2" @click="load">Atualizar histórico</button>
    </div>
    <p class="text-sm">Imagens são apagadas após 15 dias. Use “Guardar” para preservar as selecionadas sem prazo de exclusão.</p>
    <p v-if="!runs.length" class="text-sm">Nenhuma sequência registrada pelo monitoramento adaptativo.</p>
    <label class="flex gap-2 text-sm"><input v-model="savedOnly" type="checkbox" @change="page = 1; load()" />Mostrar somente sequências com imagens guardadas</label>
    <div class="flex items-center gap-2 text-sm">
      <button :disabled="page <= 1" class="rounded border p-2 disabled:opacity-50" @click="page--; load()">Anteriores</button>
      <span>Página {{ page }} · {{ total }} sequências</span>
      <button :disabled="page * 50 >= total" class="rounded border p-2 disabled:opacity-50" @click="page++; load()">Próximas</button>
    </div>
    <ol class="aqua-scrollbar max-h-96 space-y-3 overflow-y-auto pr-1">
      <li v-for="run in runs" :key="run.id" class="rounded border border-slate-200 p-3 dark:border-slate-700">
        <p>{{ new Date(run.started_at).toLocaleString('pt-BR') }} · {{ run.level }}</p>
        <p class="text-xs">Modelo {{ run.model_version || 'indisponível' }} · {{ run.frames.length }} frames</p>
        <p v-if="run.error_code" class="text-sm text-amber-700">Falha: {{ run.error_code }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <div v-for="(item, index) in run.evidence" :key="item.id" class="flex items-center gap-1 rounded border p-1">
            <button class="rounded p-2 text-sm" @click="showEvidence(item.url)">Imagem {{ index + 1 }}</button>
            <button :disabled="busy" :aria-pressed="item.preserved" :aria-label="`${item.preserved ? 'Deixar de guardar' : 'Guardar'} imagem ${index + 1}`" class="rounded border p-2 text-sm disabled:opacity-50" @click="preserveEvidence(item)">{{ item.preserved ? 'Guardada · desfazer' : 'Guardar' }}</button>
          </div>
          <button class="rounded border p-2 text-sm" @click="selectedRun = run.id">Corrigir classificação</button>
        </div>
      </li>
    </ol>
    <img v-if="preview" :src="preview" alt="Evidência da sequência selecionada" class="w-full rounded" />
    <div v-if="selectedRun" class="space-y-2">
      <p class="text-sm">A correção entra na fila de revisão antes de ser usada em treinamento.</p>
      <select v-model="classification" aria-label="Classificação revisada" class="rounded border p-2 dark:bg-slate-900">
        <option value="FLOOD_INDICATION">Alagamento</option><option value="INTERMEDIATE_INDICATION">Intermediário</option>
        <option value="NO_INDICATION">Sem indício</option><option value="UNUSABLE">Imagem inutilizável</option>
      </select>
      <button :disabled="busy || !reason.trim()" class="rounded bg-blue-700 p-2 text-white disabled:opacity-50" @click="review">Registrar correção</button>
    </div>
  </section>
</template>
