<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '@/app/plugins/axios'
import GuidedImageReview from './GuidedImageReview.vue'

type Label = { id: string; classification: string; reason: string; created_at: string }
type Evidence = {
  id: string
  url: string
  classification: string
  prediction: Record<string, number>
  captured_at: string
  label: Label | null
}
type Episode = {
  id: string
  camera_id: string
  camera_name: string
  event_id: string
  model_version: string
  reason: string
  started_at: string
  last_at: string
  observed_seconds: number
  minimum_normal: number
  latest_normal: number
  images: Evidence[]
}
type Readiness = {
  ready: boolean
  blockers: string[]
  count: number
  events: number
  partitions: Record<string, Record<string, number>>
}
type Dataset = {
  id: string
  sha256: string
  current: boolean
  created_at: string
  readiness: Readiness
}
type Job = {
  id: string
  status: string
  dataset_id: string
  progress: { phase?: string; epoch?: number; index?: number; cpu_seconds?: number }
  error_code: string
}
type Metric = {
  test_count: number
  precision: number | null
  recall: number | null
  brier_score: number
  latency_ms: number
  classes: string[]
  confusion_matrix: number[][]
  per_class: Record<
    string,
    { f1: number | null; support: number; recall_interval: number[] | null }
  >
  slices: Record<string, { count: number; recall: number }>
  metric_scope: string
  period: string[]
  worker_peak_memory_mib?: number
  calibration: { count: number; sum_probability: number; floods: number }[]
}
type Version = {
  id: string
  name: string
  status: string
  sha256: string
  manifest: Record<string, unknown>
  previously_operational: boolean
  pilots: { camera_id: string; started_at: string }[]
  pilot_blockers: string[]
  comparison: {
    dataset_id: string | null
    baseline_id: string | null
    candidate: Metric | null
    baseline: Metric | null
    blockers: string[]
    shadow_active: boolean
    shadow_windows: number
  }
}
type Page<T> = { results: T[]; count: number; page: number; page_size: number }
type Deployment = {
  id: string
  action: string
  camera_id: string | null
  previous_id: string | null
  target_id: string
  reason: string
  created_at: string
  actor__name: string
}
type Storage = { bytes: number; limit: number; warning: boolean }
type Learning = Readiness & {
  examples: {
    sha256: string
    camera_name: string
    captured_at: string
    classification: string
    episode_id: string
  }[]
  cameras: { id: string; description: string }[]
  storage: { images: Storage; models: Storage }
  review_summary: Record<string, { count: number; agreement: number | null; scope: string }>
}
const requestId = () => crypto.randomUUID()
const base = '/flood_monitoring/intelligence'
const tabs = ['Revisões', 'Base de aprendizado', 'Treinamentos', 'Modelos']
const tab = ref(0)
const focusedEpisode = ref('')
const deployments = ref<Deployment[]>([])
const busy = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const episodes = ref<Page<Episode>>({ results: [], count: 0, page: 1, page_size: 20 })
const datasets = ref<Page<Dataset>>({ results: [], count: 0, page: 1, page_size: 20 })
const jobs = ref<Page<Job>>({ results: [], count: 0, page: 1, page_size: 20 })
const models = ref<Page<Version>>({ results: [], count: 0, page: 1, page_size: 20 })
const learning = ref<Learning | null>(null)
const kind = ref('divergence')
const review = ref('pending')
const camera = ref('')
const reasonFilter = ref('')
const from = ref('')
const to = ref('')
const page = ref(1)
const selectedDataset = ref('')
const selectedVersion = ref('')
const action = ref('PILOT')
const pilotCamera = ref('')
const deploymentReason = ref('')
const imageIndices = ref<Record<string, number>>({})
function currentImages(episode: Episode) {
  const index = imageIndices.value[episode.id] ?? 0
  return episode.images.slice(index, index + 1)
}
function advanceImage(episode: Episode) {
  imageIndices.value[episode.id] =
    ((imageIndices.value[episode.id] ?? 0) + 1) % episode.images.length
}
const events = ref<Record<string, string>>({})
const previews = ref<Record<string, string>>({})
const history = ref<
  Record<
    string,
    {
      history: { run_id: string; run__started_at: string; valid: boolean; normal: number | null }[]
    }
  >
>({})
const metricLabels: Record<string, string> = {
  normal: 'Sem indício',
  medium: 'Intermediário',
  flooded: 'Alagamento',
  day: 'Diurno',
  night: 'Noturno',
}
const phaseLabels: Record<string, string> = {
  train: 'Treino',
  validation: 'Validação',
  candidate: 'Teste do candidato',
  baseline: 'Teste da referência',
  complete: 'Concluído',
}
const labels: Record<string, string> = {
  NO_INDICATION: 'Sem indício',
  INTERMEDIATE_INDICATION: 'Intermediário',
  FLOOD_INDICATION: 'Alagamento',
  UNUSABLE: 'Imagem inadequada',
  INDETERMINATE: 'Não consigo determinar',
}
const states: Record<string, string> = {
  WAITING_DATA: 'Aguardando dados',
  WAITING_CAPACITY: 'Aguardando capacidade',
  TRAINING: 'Treinando',
  PAUSED: 'Pausado',
  EVALUATING: 'Avaliando',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
  champion: 'Operacional',
  candidate: 'Candidato',
  shadow: 'Em avaliação',
  retired: 'Anterior',
}
const reasonLabels: Record<string, string> = {
  STRONG: 'Indício forte',
  PERSISTENT: 'Divergência persistente',
  NORMAL_AUDIT: 'Auditoria de normalidade',
}
const percent = (v: number | null | undefined) =>
  v == null ? 'Sem medição' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const date = (v: string) => new Date(v).toLocaleString('pt-BR')
const size = (v: number) =>
  `${(v / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GiB`
const currentPage = computed(
  () => [episodes.value, datasets.value, jobs.value, models.value][tab.value]!,
)
const chosenVersion = computed(() =>
  models.value.results.find((v) => v.id === selectedVersion.value),
)
let generation = 0
function message(err: unknown) {
  const detail = (err as { response?: { data?: { detail?: string | string[] } } }).response?.data
    ?.detail
  return Array.isArray(detail)
    ? detail.join(' ')
    : detail || 'Não foi possível concluir a operação. Tente novamente.'
}
function filterEpisodes() {
  if (busy.value) return
  focusedEpisode.value = ''
  page.value = 1
  load()
}
function changePage(offset: number) {
  if (busy.value) return
  page.value += offset
  load()
}
function revoke() {
  Object.values(previews.value).forEach(URL.revokeObjectURL)
  previews.value = {}
}
async function load() {
  const id = ++generation
  loading.value = true
  error.value = ''
  try {
    const summary = await api.get<Learning>(`${base}/learning/`)
    if (id !== generation) return
    learning.value = summary.data
    if (tab.value === 0) {
      const response = focusedEpisode.value
        ? await api.get<Episode>(`${base}/episodes/${focusedEpisode.value}/`)
        : null
      const { data } = response
        ? { data: { results: [response.data], count: 1, page: 1, page_size: 20 } }
        : await api.get<Page<Episode>>(`${base}/episodes/`, {
            params: {
              page: page.value,
              kind: kind.value,
              review: review.value,
              camera: camera.value || undefined,
              reason: reasonFilter.value || undefined,
              from: from.value ? new Date(from.value).toISOString() : undefined,
              to: to.value ? new Date(to.value).toISOString() : undefined,
            },
          })
      if (id !== generation) return
      episodes.value = data
      revoke()
      for (const episode of data.results) {
        events.value[episode.id] = episode.event_id
        const pending = episode.images.findIndex((item) => !item.label)
        imageIndices.value[episode.id] = pending < 0 ? 0 : pending
        for (const item of episode.images) {
          try {
            const result = await api.get(item.url.replace(/^\/api/, ''), { responseType: 'blob' })
            if (id !== generation) return
            previews.value[item.id] = URL.createObjectURL(result.data)
          } catch {
            if (id === generation)
              error.value = 'Uma evidência não pôde ser carregada. Atualize para renovar os links.'
          }
        }
      }
    } else {
      const resource = tab.value === 1 ? 'datasets' : tab.value === 2 ? 'jobs' : 'models'
      const { data } = await api.get(`${base}/${resource}/`, { params: { page: page.value } })
      if (id !== generation) return
      if (tab.value === 1) datasets.value = data
      if (tab.value === 2) {
        jobs.value = data
        datasets.value = (await api.get(`${base}/datasets/`)).data
      }
      if (tab.value === 3) {
        models.value = data
        deployments.value = data.deployments || []
        datasets.value = (await api.get(`${base}/datasets/`)).data
      }
    }
  } catch (err) {
    if (id === generation) error.value = message(err)
  } finally {
    if (id === generation) loading.value = false
  }
}
async function mutate(path: string, payload: unknown, success: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await api.post(`${base}${path}`, payload)
    notice.value = success
    await load()
  } catch (err) {
    error.value = message(err)
  } finally {
    busy.value = false
  }
}
function deploy() {
  if (!selectedVersion.value) return
  return mutate(
    `/models/${selectedVersion.value}/actions/`,
    {
      request_id: requestId(),
      action: action.value,
      dataset_id: action.value === 'evaluate' ? selectedDataset.value || undefined : undefined,
      reason: deploymentReason.value,
      camera_id: ['PILOT', 'ROLLBACK', 'GLOBAL_FALLBACK'].includes(action.value)
        ? pilotCamera.value || null
        : null,
    },
    'Ação de modelo registrada.',
  )
}
function inspectExample(id: string) {
  focusedEpisode.value = id
  tab.value = 0
}
async function loadHistory(id: string) {
  try {
    history.value[id] = (await api.get(`${base}/episodes/${id}/`)).data
  } catch (err) {
    error.value = message(err)
  }
}
watch(tab, () => {
  page.value = 1
  load()
})
onMounted(load)
onBeforeUnmount(() => {
  generation++
  revoke()
})
</script>

<template>
  <section class="intelligence" aria-labelledby="intelligence-title">
    <header class="intro">
      <div>
        <p class="eyebrow">ADMINISTRAÇÃO</p>
        <h1 id="intelligence-title">Inteligência do monitoramento</h1>
        <p>Revise evidências, forme a base de aprendizado e acompanhe cada versão do modelo.</p>
      </div>
      <button :disabled="loading || busy" @click="load">Atualizar</button>
    </header>
    <nav class="tabs" aria-label="Seções de inteligência">
      <button
        v-for="(name, index) in tabs"
        :key="name"
        :disabled="busy"
        :aria-current="tab === index ? 'page' : undefined"
        @click="tab = index"
      >
        {{ name }}
      </button>
    </nav>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="notice" role="status" class="success">{{ notice }}</p>
    <p v-if="loading" role="status">Carregando informações…</p>
    <template v-else>
      <div v-if="tab === 0">
        <p class="note">
          Observe a imagem e registre sua decisão. A previsão do modelo será mostrada após salvar.
          Cada imagem precisa de uma revisão própria.
        </p>
        <form class="filters" @submit.prevent="filterEpisodes">
          <label
            >Fila<select v-model="kind">
              <option value="divergence">Episódios relevantes</option>
              <option value="audit">Auditoria de normalidade</option>
            </select></label
          >
          <label
            >Revisão<select v-model="review">
              <option value="pending">Pendentes</option>
              <option value="reviewed">Revisados</option>
              <option value="">Todos</option>
            </select></label
          >
          <label
            >Câmera<select v-model="camera">
              <option value="">Todas</option>
              <option v-for="c in learning?.cameras" :key="c.id" :value="c.id">
                {{ c.description }}
              </option>
            </select></label
          >
          <label
            >Motivo<select v-model="reasonFilter">
              <option value="">Todos</option>
              <option v-for="(text, key) in reasonLabels" :key="key" :value="key">
                {{ text }}
              </option>
            </select></label
          >
          <label>Desde<input v-model="from" type="datetime-local" /></label
          ><label>Até<input v-model="to" type="datetime-local" /></label
          ><button :disabled="busy">Filtrar</button>
        </form>
        <div v-if="!episodes.results.length" class="empty">
          <h2>Nenhum episódio nesta fila</h2>
          <p>
            Os casos aparecerão a partir das análises existentes. A auditoria de normalidade
            seleciona até um caso por câmera por dia.
          </p>
        </div>
        <article v-for="episode in episodes.results" :key="episode.id" class="card">
          <header>
            <div>
              <h2>{{ episode.camera_name }}</h2>
              <p>{{ date(episode.started_at) }} → {{ date(episode.last_at) }}</p>
            </div>
            <span>{{ Math.floor(episode.observed_seconds / 60) }} min observados</span>
          </header>
          <p role="status">
            {{ episode.images.filter((item) => item.label).length }} de
            {{ episode.images.length }} imagens revisadas neste episódio.
            {{
              !episode.images.length
                ? 'Sem imagens para revisão.'
                : episode.images.some((item) => !item.label)
                  ? 'Há imagens pendentes.'
                  : 'Revisão do episódio concluída.'
            }}
          </p>
          <template v-for="item in currentImages(episode)" :key="item.id">
            <p>Imagem {{ (imageIndices[episode.id] ?? 0) + 1 }} de {{ episode.images.length }}</p>
            <GuidedImageReview
              :item="item"
              :preview="previews[item.id]"
              :camera-name="episode.camera_name"
              :busy="busy"
              @saving="busy = $event"
              @saved="item.label = $event"
            />
            <button
              v-if="item.label && episode.images.length > 1"
              :disabled="busy"
              @click="advanceImage(episode)"
            >
              {{
                (imageIndices[episode.id] ?? 0) + 1 < episode.images.length
                  ? 'Avançar para próxima imagem'
                  : 'Voltar à primeira imagem'
              }}
            </button>
          </template>
          <p v-if="!episode.images.length">Nenhuma imagem disponível neste episódio.</p>
          <details>
            <summary>Por que este episódio entrou na fila?</summary>
            <p>
              {{ reasonLabels[episode.reason] || episode.reason }}. A seleção para revisão não
              confirma alagamento.
            </p>
            <p>
              Versão do modelo: <code>{{ episode.model_version }}</code>
            </p>
          </details>
          <details>
            <summary>Histórico e grupo do evento</summary>
            <p>
              Vincule episódios do mesmo acontecimento usando o mesmo identificador, inclusive entre
              câmeras.
            </p>
            <form
              class="filters"
              @submit.prevent="
                mutate(
                  `/episodes/${episode.id}/`,
                  { event_id: events[episode.id] },
                  'Vínculo de evento atualizado. Gere um novo conjunto antes de treinar.',
                )
              "
            >
              <label>Identificador do evento<input v-model="events[episode.id]" required /></label
              ><button :disabled="busy">Vincular evento</button>
            </form>
            <button
              v-if="episode.images.length && episode.images.every((item) => item.label)"
              @click="loadHistory(episode.id)"
            >
              Consultar histórico
            </button>
            <div
              v-if="history[episode.id] && episode.images.every((item) => item.label)"
              class="table-wrap"
            >
              <table>
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Normalidade</th>
                    <th>Qualidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="point in history[episode.id]?.history" :key="point.run_id">
                    <td>{{ date(point.run__started_at) }}</td>
                    <td>{{ percent(point.normal == null ? null : point.normal / 100) }}</td>
                    <td>{{ point.valid ? 'Válida' : 'Insuficiente' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </article>
      </div>
      <div v-else-if="tab === 1 && learning">
        <div class="stats">
          <div>
            <strong>{{ learning.count }}</strong
            ><span>imagens elegíveis</span>
          </div>
          <div>
            <strong>{{ learning.events }}</strong
            ><span>grupos de eventos</span>
          </div>
          <div>
            <strong>{{ learning.ready ? 'Pronta' : 'Em formação' }}</strong
            ><span>base de aprendizado</span>
          </div>
        </div>
        <div class="card">
          <h2>Prontidão da base</h2>
          <ul v-if="learning.blockers.length">
            <li v-for="blocker in learning.blockers" :key="blocker">{{ blocker }}</li>
          </ul>
          <p v-else>
            Os mínimos de amostragem foram atendidos. A origem do modelo e a separação prospectiva
            também serão verificadas ao solicitar o treinamento.
          </p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Partição</th>
                  <th>Sem indício</th>
                  <th>Intermediário</th>
                  <th>Alagamento</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(counts, part) in learning.partitions" :key="part">
                  <th>
                    {{ { train: 'Treino', validation: 'Validação', test: 'Teste' }[part] || part }}
                  </th>
                  <td>{{ counts.NO_INDICATION }}</td>
                  <td>{{ counts.INTERMEDIATE_INDICATION }}</td>
                  <td>{{ counts.FLOOD_INDICATION }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            :disabled="busy || !learning.count"
            @click="mutate('/datasets/', {}, 'Conjunto imutável criado.')"
          >
            Criar versão do conjunto
          </button>
        </div>
        <div class="stats">
          <div v-for="(storage, key) in learning.storage" :key="key">
            <strong>{{
              key === 'images' ? 'Imagens selecionadas' : 'Modelos e checkpoints'
            }}</strong
            ><span>{{ size(storage.bytes) }} de {{ size(storage.limit) }}</span>
            <p v-if="storage.warning" class="error">Armazenamento acima de 80%.</p>
          </div>
        </div>
        <div class="card">
          <h2>Concordância nas revisões</h2>
          <p>Estas filas são selecionadas. Seus resultados não medem a taxa geral de acerto.</p>
          <p v-for="(summary, key) in learning.review_summary" :key="key">
            {{ key === 'audit' ? 'Auditoria de normalidade' : 'Episódios relevantes' }}:
            {{ percent(summary.agreement) }} em {{ summary.count }} imagens revisadas.
          </p>
        </div>
        <div class="card">
          <h2>Exemplos validados</h2>
          <p v-if="!learning.examples.length">Nenhuma imagem elegível foi validada ainda.</p>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Câmera</th>
                  <th>Captura</th>
                  <th>Classificação humana</th>
                  <th>Evidências</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="example in learning.examples.slice(0, 12)" :key="example.sha256">
                  <td>{{ example.camera_name }}</td>
                  <td>{{ date(example.captured_at) }}</td>
                  <td>{{ labels[example.classification] }}</td>
                  <td><button @click="inspectExample(example.episode_id)">Ver episódio</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <article v-for="dataset in datasets.results" :key="dataset.id" class="card">
          <h3>Conjunto {{ dataset.id.slice(0, 8) }}</h3>
          <p>
            {{ date(dataset.created_at) }} · {{ dataset.readiness.count }} imagens ·
            {{ dataset.current ? 'Revisões atuais' : 'Superado por novas revisões ou eventos' }}
          </p>
          <code>{{ dataset.sha256 }}</code>
        </article>
      </div>
      <div v-else-if="tab === 2">
        <div class="card">
          <h2>Treinar candidato</h2>
          <p>
            Execução local com até 1 vCPU, 2 GiB e uma thread. O treinamento aguarda cinco minutos
            de capacidade estável e pausa sob pressão ou câmera crítica. O modelo operacional só
            muda por aplicação administrativa.
          </p>
          <form
            class="filters"
            @submit.prevent="
              mutate(
                '/jobs/',
                { dataset_id: selectedDataset, request_id: requestId() },
                'Treinamento solicitado.',
              )
            "
          >
            <label
              >Conjunto validado<select v-model="selectedDataset" required>
                <option value="">Selecione um conjunto pronto</option>
                <option
                  v-for="d in datasets.results"
                  :key="d.id"
                  :value="d.id"
                  :disabled="!d.current || !d.readiness.ready"
                >
                  {{ d.id.slice(0, 8) }} · {{ d.readiness.count }} imagens
                  {{ !d.current ? '(superado)' : !d.readiness.ready ? '(faltam dados)' : '' }}
                </option>
              </select></label
            ><button :disabled="busy || !selectedDataset">Treinar candidato</button>
          </form>
        </div>
        <div v-if="!jobs.results.length" class="empty">
          <h2>Nenhum treinamento solicitado</h2>
          <p>Revise as imagens, registre o modelo atual e forme um conjunto pronto para iniciar.</p>
        </div>
        <article v-for="job in jobs.results" :key="job.id" class="card">
          <header>
            <h2>Treinamento {{ job.id.slice(0, 8) }}</h2>
            <span class="badge">{{ states[job.status] || job.status }}</span>
          </header>
          <p v-if="job.progress.phase">
            Etapa {{ phaseLabels[job.progress.phase] || job.progress.phase }} · época
            {{ job.progress.epoch }} · imagem
            {{ job.progress.index }}
          </p>
          <p v-if="job.error_code" class="error">Falha: {{ job.error_code }}</p>
          <div v-if="!['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)" class="actions">
            <button
              :disabled="busy"
              @click="mutate(`/jobs/${job.id}/`, { action: 'pause' }, 'Pausa solicitada.')"
            >
              Pausar</button
            ><button
              :disabled="busy"
              @click="
                mutate(
                  `/jobs/${job.id}/`,
                  { action: 'resume' },
                  'Retomada solicitada; aguardando capacidade.',
                )
              "
            >
              Retomar</button
            ><button
              :disabled="busy"
              @click="mutate(`/jobs/${job.id}/`, { action: 'cancel' }, 'Cancelamento solicitado.')"
            >
              Cancelar
            </button>
          </div>
        </article>
      </div>
      <div v-else-if="tab === 3">
        <div v-if="!models.results.length" class="empty">
          <h2>Registre o modelo em uso</h2>
          <p>
            O checkpoint configurado será verificado e registrado. A origem desconhecida ficará
            explícita e a avaliação usará novos episódios.
          </p>
          <button
            :disabled="busy"
            @click="
              mutate(
                '/models/',
                { action: 'bootstrap', request_id: requestId() },
                'Modelo operacional registrado.',
              )
            "
          >
            Registrar checkpoint operacional
          </button>
        </div>
        <article v-for="model in models.results" :key="model.id" class="card">
          <header>
            <h2>{{ model.name }}</h2>
            <span class="badge">{{ states[model.status] || model.status }}</span>
          </header>
          <p>
            Hash <code>{{ model.sha256 }}</code>
          </p>
          <p>Conjunto de avaliação: {{ model.comparison.dataset_id || 'Ainda não avaliado' }}</p>
          <div v-if="model.comparison.candidate && model.comparison.baseline" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Indicador no mesmo teste</th>
                  <th>Esta versão</th>
                  <th>Operacional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Imagens</th>
                  <td>{{ model.comparison.candidate.test_count }}</td>
                  <td>{{ model.comparison.baseline.test_count }}</td>
                </tr>
                <tr>
                  <th>Precisão para alagamento</th>
                  <td>{{ percent(model.comparison.candidate.precision) }}</td>
                  <td>{{ percent(model.comparison.baseline.precision) }}</td>
                </tr>
                <tr>
                  <th>Sensibilidade para alagamento</th>
                  <td>{{ percent(model.comparison.candidate.recall) }}</td>
                  <td>{{ percent(model.comparison.baseline.recall) }}</td>
                </tr>
                <tr>
                  <th>Erro de calibração (Brier)</th>
                  <td>{{ model.comparison.candidate.brier_score.toFixed(3) }}</td>
                  <td>{{ model.comparison.baseline.brier_score.toFixed(3) }}</td>
                </tr>
                <tr>
                  <th>Latência média de inferência</th>
                  <td>{{ model.comparison.candidate.latency_ms.toFixed(0) }} ms</td>
                  <td>{{ model.comparison.baseline.latency_ms.toFixed(0) }} ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="model.comparison.shadow_active">Avaliação paralela ativa.</p>
          <p>{{ model.comparison.shadow_windows }} janelas paralelas válidas.</p>
          <ul>
            <li v-for="blocker in model.comparison.blockers" :key="blocker">{{ blocker }}</li>
          </ul>
          <details>
            <summary>Métricas por classe, incerteza e origem</summary>
            <p>
              Origem:
              {{
                model.manifest.provenance === 'unknown'
                  ? 'Histórico de treinamento desconhecido; avaliação prospectiva'
                  : model.manifest.provenance || 'Não informada'
              }}.
            </p>
            <template v-if="model.comparison.candidate">
              <p>
                Período do teste: {{ model.comparison.candidate.period?.map(date).join(' → ') }}.
              </p>
              <p v-if="model.comparison.candidate.worker_peak_memory_mib">
                Pico de memória do processo de avaliação:
                {{ model.comparison.candidate.worker_peak_memory_mib.toFixed(0) }} MiB.
              </p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Exemplos</th>
                      <th>F1</th>
                      <th>Sensibilidade: intervalo de 95%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(value, name) in model.comparison.candidate.per_class" :key="name">
                      <th>{{ metricLabels[name] || name }}</th>
                      <td>{{ value.support }}</td>
                      <td>{{ percent(value.f1) }}</td>
                      <td>
                        {{ value.recall_interval?.map(percent).join(' – ') || 'Sem amostra' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="note">
                Intervalos de Wilson: imagens do mesmo evento não são independentes. A incerteza
                entre eventos pode ser maior.
              </p>
              <h3>Matriz de confusão</h3>
              <p>Linhas: classificação humana. Colunas: previsão do modelo.</p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Real / previsto</th>
                      <th v-for="name in model.comparison.candidate.classes" :key="name">
                        {{ metricLabels[name] || name }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, index) in model.comparison.candidate.confusion_matrix"
                      :key="index"
                    >
                      <th>{{ metricLabels[model.comparison.candidate.classes[index] || ''] }}</th>
                      <td v-for="(count, column) in row" :key="column">{{ count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h3>Resultados por câmera e período</h3>
              <p>Recortes com pelo menos cinco exemplos de alagamento.</p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Recorte</th>
                      <th>Exemplos</th>
                      <th>Sensibilidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(slice, name) in model.comparison.candidate.slices" :key="name">
                      <th>
                        {{
                          metricLabels[name] ||
                          learning?.cameras.find((c) => c.id === name)?.description ||
                          name
                        }}
                      </th>
                      <td>{{ slice.count }}</td>
                      <td>{{ percent(slice.recall) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h3>Calibração dos percentuais</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Faixa prevista</th>
                      <th>Exemplos</th>
                      <th>Percentual médio previsto</th>
                      <th>Alagamento observado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(bin, index) in model.comparison.candidate.calibration" :key="index">
                      <th>{{ index * 10 }}–{{ (index + 1) * 10 }}%</th>
                      <td>{{ bin.count }}</td>
                      <td>{{ percent(bin.count ? bin.sum_probability / bin.count : null) }}</td>
                      <td>{{ percent(bin.count ? bin.floods / bin.count : null) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <p v-for="pilot in model.pilots" :key="pilot.camera_id">
              Piloto em
              {{
                learning?.cameras.find((c) => c.id === pilot.camera_id)?.description ||
                pilot.camera_id
              }}, iniciado em {{ date(pilot.started_at) }}.
            </p>
          </details>
        </article>
        <details v-if="deployments.length" class="card">
          <summary>Histórico de aplicações</summary>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Responsável</th>
                  <th>Ação</th>
                  <th>Escopo</th>
                  <th>Destino</th>
                  <th>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in deployments" :key="entry.id">
                  <td>{{ date(entry.created_at) }}</td>
                  <td>{{ entry.actor__name }}</td>
                  <td>
                    {{
                      {
                        BOOTSTRAP: 'Registro inicial',
                        SHADOW: 'Avaliação paralela',
                        PILOT: 'Piloto',
                        EXPAND: 'Aplicação global',
                        ROLLBACK: 'Restauração',
                        GLOBAL_FALLBACK: 'Retorno global',
                      }[entry.action] || entry.action
                    }}
                  </td>
                  <td>
                    {{
                      entry.camera_id
                        ? learning?.cameras.find((c) => c.id === entry.camera_id)?.description ||
                          entry.camera_id
                        : 'Global'
                    }}
                  </td>
                  <td>
                    {{
                      models.results.find((m) => m.id === entry.target_id)?.name || entry.target_id
                    }}
                  </td>
                  <td>{{ entry.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <form v-if="models.results.length" class="card" @submit.prevent="deploy">
          <h2>Operar versões</h2>
          <label v-if="action === 'evaluate'"
            >Conjunto para comparação<select v-model="selectedDataset" required>
              <option value="">Selecione</option>
              <option
                v-for="d in datasets.results"
                :key="d.id"
                :value="d.id"
                :disabled="!d.current || !d.readiness.ready"
              >
                {{ d.id.slice(0, 8) }} · {{ d.readiness.count }} imagens
              </option>
            </select></label
          >
          <div class="filters">
            <label
              >Versão<select v-model="selectedVersion" required>
                <option value="">Selecione</option>
                <option v-for="m in models.results" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select></label
            ><label
              >Ação<select v-model="action">
                <option value="evaluate">Comparar no conjunto de teste</option>
                <option value="shadow">Iniciar avaliação em paralelo</option>
                <option value="PILOT">Aplicar piloto</option>
                <option value="EXPAND">Expandir globalmente</option>
                <option value="ROLLBACK">Restaurar versão</option>
                <option value="GLOBAL_FALLBACK">Retornar piloto ao modelo global</option>
              </select></label
            ><label v-if="['PILOT', 'ROLLBACK', 'GLOBAL_FALLBACK'].includes(action)"
              >Câmera<select v-model="pilotCamera" :required="action !== 'ROLLBACK'">
                <option value="">
                  {{ action === 'ROLLBACK' ? 'Escopo global' : 'Selecione a câmera piloto' }}
                </option>
                <option v-for="c in learning?.cameras" :key="c.id" :value="c.id">
                  {{ c.description }}
                </option>
              </select></label
            >
          </div>
          <label
            >Justificativa<textarea
              v-model="deploymentReason"
              :required="action !== 'shadow'"
              maxlength="2000"
            />
          </label>
          <ul v-if="action === 'EXPAND'">
            <li v-for="blocker in chosenVersion?.pilot_blockers" :key="blocker">{{ blocker }}</li>
          </ul>
          <p v-if="action === 'ROLLBACK'">
            A restauração aceita somente versões anteriormente operacionais e compatíveis. Análises
            em andamento terminam com sua versão original.
          </p>
          <button :disabled="busy || !selectedVersion">Executar ação</button>
        </form>
      </div>
      <footer class="pagination">
        <span>{{ currentPage.count }} registros</span
        ><button :disabled="page <= 1" @click="changePage(-1)">Anterior</button
        ><span>Página {{ page }}</span
        ><button
          :disabled="page * currentPage.page_size >= currentPage.count"
          @click="changePage(1)"
        >
          Próxima
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.intelligence,
.intelligence * {
  box-sizing: border-box;
}
.intelligence {
  width: 100%;
  min-width: 0;
  color: #153b59;
  padding: 1rem;
}
.intro,
.card header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}
.intro {
  margin-bottom: 1.5rem;
}
.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: #567184;
}
:global(.dark .intelligence .intro),
:global(.dark .intelligence .intro h1),
:global(.dark .intelligence .intro p) {
  color: #ffffff;
}
h1 {
  font-size: 1.7rem;
  font-weight: 700;
}
h2 {
  font-size: 1.2rem;
  font-weight: 650;
}
h3 {
  font-weight: 650;
}
p {
  margin: 0.6rem 0;
  line-height: 1.55;
}
.tabs {
  display: flex;
  gap: 0.4rem;
  border-bottom: 1px solid #cddce6;
  overflow-x: auto;
  margin-bottom: 1rem;
}
.tabs button {
  border: 0;
  border-radius: 0;
  background: transparent;
  white-space: nowrap;
  color: #35546a;
}
.tabs button[aria-current] {
  border-bottom: 3px solid #0453af;
  color: #0453af;
  font-weight: 700;
}
button {
  border: 1px solid #a6bfd3;
  border-radius: 0.55rem;
  padding: 0.65rem 0.9rem;
  background: #edf5fc;
  color: #064b91;
  font-weight: 600;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 3px solid #3294ef;
  outline-offset: 2px;
}
.card {
  border: 1px solid #d7e3ec;
  border-radius: 1rem;
  padding: 1.25rem;
  margin: 1rem 0;
  background: white;
}
.filters,
.actions {
  display: flex;
  gap: 0.8rem;
  align-items: end;
  flex-wrap: wrap;
  margin: 1rem 0;
}
label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  flex: 1;
  min-width: 150px;
}
input,
select,
textarea {
  border: 1px solid #a6bfd3;
  border-radius: 0.45rem;
  padding: 0.55rem;
  color: #153b59;
  background: white;
  width: 100%;
  min-width: 0;
}
textarea {
  resize: vertical;
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 1rem;
  background: #e7f2fd;
  color: #0453af;
  font-size: 0.8rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}
.stats > div {
  border: 1px solid #d7e3ec;
  padding: 1.2rem;
  border-radius: 0.8rem;
  background: #f5f9fc;
}
.stats strong,
.stats span {
  display: block;
}
.stats strong {
  font-size: 1.3rem;
}
.empty {
  text-align: center;
  padding: 3rem 1rem;
  background: #f5f9fc;
  border-radius: 1rem;
}
.empty .material-symbols-outlined {
  font-size: 2.5rem;
  color: #648da9;
}
.note {
  background: #edf5fc;
  padding: 0.8rem;
  border-radius: 0.6rem;
}
.error {
  background: #fff0ee;
  color: #993626;
  padding: 0.8rem;
  border-radius: 0.5rem;
}
.success {
  background: #edf8f3;
  color: #236343;
  padding: 0.6rem;
  border-radius: 0.5rem;
}
.table-wrap {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.7rem 0;
}
th,
td {
  text-align: left;
  padding: 0.7rem;
  border-bottom: 1px solid #e2eaf0;
}
code {
  overflow-wrap: anywhere;
  font-size: 0.8rem;
}
ul {
  padding-left: 1.2rem;
  list-style: disc;
}
li {
  margin: 0.35rem 0;
}
details {
  margin-top: 1rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
pre {
  font-size: 0.75rem;
  max-height: 24rem;
  overflow: auto;
  background: #f3f6f9;
  padding: 1rem;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  align-items: center;
  margin-top: 1.5rem;
}
@media (max-width: 640px) {
  .intro,
  .card header {
    flex-direction: column;
  }
  .intelligence {
    padding: 0.7rem;
  }
  .card {
    padding: 0.9rem;
  }
  .pagination {
    gap: 0.4rem;
    font-size: 0.8rem;
  }
  h1 {
    font-size: 1.4rem;
  }
}
</style>
