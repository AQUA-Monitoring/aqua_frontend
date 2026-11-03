<script setup lang="ts">
import { formatLocale } from '@/app/i18n'
import { computed } from 'vue'
import {
  FLOOD_DEMO_STATES,
  type FloodDemoSourceSlot,
  type FloodDemoState,
} from './floodDemo'
import { floodDemoScenarioLabel } from './floodDemoPresentation'

const props = defineProps<{
  sources: FloodDemoSourceSlot[]
  loading: boolean
  message: string | null
  canUpload: boolean
  uploadingMode: FloodDemoState | null
  uploadProgress: number | null
}>()

const emit = defineEmits<{
  upload: [mode: FloodDemoState, file: File]
}>()

const slots = computed(() =>
  FLOOD_DEMO_STATES.map((mode) => ({
    mode,
    source: props.sources.find((source) => source.mode === mode) ?? null,
  })),
)

function formatSize(value: number | null | undefined) {
  if (value == null) return 'Tamanho não disponível'
  return new Intl.NumberFormat(formatLocale(), {
    style: 'unit',
    unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(value / (value >= 1_000_000 ? 1_000_000 : 1_000))
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Ainda não enviado'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Data não disponível'
    : new Intl.DateTimeFormat(formatLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function chooseFile(mode: FloodDemoState, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', mode, file)
  input.value = ''
}

const statusContent = {
  processing: { label: 'Processando', className: 'bg-amber-100 text-amber-900' },
  ready: { label: 'Pronto', className: 'bg-emerald-100 text-emerald-900' },
  error: { label: 'Falha', className: 'bg-red-100 text-red-800' },
} as const
</script>

<template>
  <section
    class="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-[#001C3B]"
    aria-labelledby="demo-sources-title"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold tracking-[0.14em] text-[#2768CA] uppercase">
          Área administrativa
        </p>
        <h2 id="demo-sources-title" class="mt-1 text-xl font-semibold">Vídeos por modo</h2>
        <p class="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          O vídeo atual permanece no player enquanto um novo arquivo é preparado. A troca ocorre
          somente quando uma nova sessão está pronta.
        </p>
      </div>
      <span v-if="loading" class="inline-flex items-center gap-2 text-sm" aria-live="polite">
        <span class="material-symbols-outlined animate-spin" aria-hidden="true"
          >progress_activity</span
        >Atualizando vídeos
      </span>
    </div>

    <div class="mt-5 grid gap-4 md:grid-cols-3">
      <article
        v-for="slot in slots"
        :key="slot.mode"
        class="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">{{ floodDemoScenarioLabel(slot.mode) }}</h3>
          <span
            v-if="slot.source"
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="statusContent[slot.source.status].className"
          >
            {{ statusContent[slot.source.status].label }}
          </span>
        </div>
        <p class="mt-2 min-h-10 text-sm text-slate-600 dark:text-slate-300">
          {{ slot.source?.description || 'Nenhuma descrição disponível.' }}
        </p>
        <dl class="mt-4 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex justify-between gap-3">
            <dt>Arquivo</dt>
            <dd class="text-right">{{ formatSize(slot.source?.size_bytes) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Envio</dt>
            <dd class="text-right">{{ formatDate(slot.source?.uploaded_on) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Em uso</dt>
            <dd class="font-semibold">{{ slot.source?.active ? 'Sim' : 'Não' }}</dd>
          </div>
        </dl>
        <p
          v-if="slot.source?.error"
          class="mt-3 text-sm font-semibold text-red-700 dark:text-red-300"
        >
          {{ slot.source.error }}
        </p>

        <label
          v-if="canUpload"
          class="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#2768CA] px-3 text-center text-sm font-semibold text-[#2768CA] focus-within:ring-2 focus-within:ring-[#2768CA] focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 dark:text-[#9CC4FF]"
        >
          <span>
            {{ uploadingMode === slot.mode ? 'Enviando…' : 'Substituir vídeo' }}
            <span v-if="uploadingMode === slot.mode && uploadProgress !== null">
              {{ uploadProgress }}%
            </span>
          </span>
          <input
            type="file"
            accept="video/*"
            class="sr-only"
            :aria-label="`Substituir vídeo do modo ${floodDemoScenarioLabel(slot.mode)}`"
            :disabled="uploadingMode !== null || slot.source?.status === 'processing'"
            @change="chooseFile(slot.mode, $event)"
          />
        </label>
      </article>
    </div>

    <p
      v-if="message"
      class="mt-4 text-sm font-semibold"
      :class="message.includes('concluído') ? 'text-emerald-700' : 'text-red-700 dark:text-red-300'"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </p>
  </section>
</template>
