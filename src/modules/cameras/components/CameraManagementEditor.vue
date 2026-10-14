<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import CameraStatusBadge from './CameraStatusBadge.vue'
import CameraMonitoringTimeline from './CameraMonitoringTimeline.vue'
import type { CameraApiItem, CameraStatus, CameraUpdatePayload } from '../types/camera'
import { cameraAddressLabel, cameraCoordinates } from '../utils/cameraPresentation'
import {
  cameraStatusOptionDisabled,
  cameraTerritorialWarning,
} from '../utils/cameraTerritorialReadiness'

const props = defineProps<{
  camera: CameraApiItem
  saving?: boolean
  error?: string | null
}>()
const emit = defineEmits<{
  close: []
  dirtyChange: [dirty: boolean]
  save: [payload: CameraUpdatePayload]
  editLocation: []
}>()

const isDesktop = useMediaQuery('(min-width: 1024px)')
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
const form = reactive({
  description: '',
  videoHls: '',
  videoEmbed: '',
  status: 'ACTIVE' as CameraStatus,
})
const baseline = ref('')

function snapshot() {
  return JSON.stringify({
    description: form.description,
    videoHls: form.videoHls,
    videoEmbed: form.videoEmbed,
    status: form.status,
  })
}

function resetForm() {
  form.description = props.camera.description
  form.videoHls = props.camera.video_hls ?? ''
  form.videoEmbed = props.camera.video_embed ?? ''
  form.status = props.camera.status as CameraStatus
  baseline.value = snapshot()
  emit('dirtyChange', false)
}

const isDirty = computed(() => snapshot() !== baseline.value)
const hasCoordinates = computed(() => cameraCoordinates(props.camera) !== null)
const territorialWarning = computed(() => cameraTerritorialWarning(props.camera))

watch(() => props.camera, resetForm, { immediate: true })
watch(isDirty, (value) => emit('dirtyChange', value))

function submit() {
  emit('save', {
    description: form.description.trim(),
    video_hls: form.videoHls.trim() || undefined,
    video_embed: form.videoEmbed.trim() || null,
    status: form.status,
  })
}

function focusableElements() {
  return Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (isDesktop.value || event.key !== 'Tab') return
  const elements = focusableElements()
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', handleKeydown)
  if (!isDesktop.value) {
    await nextTick()
    closeButton.value?.focus()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  emit('dirtyChange', false)
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
})
</script>

<template>
  <section
    ref="panel"
    class="fixed inset-0 z-[70] overflow-y-auto bg-white p-5 shadow-2xl lg:sticky lg:top-5 lg:z-30 lg:max-h-[calc(100dvh-2.5rem)] lg:rounded-3xl lg:border lg:border-slate-200 dark:bg-[#001C3B] lg:dark:border-slate-700"
    :role="isDesktop ? 'region' : 'dialog'"
    :aria-modal="isDesktop ? undefined : true"
    aria-labelledby="camera-management-editor-title"
    tabindex="-1"
  >
    <form class="grid gap-5" @submit.prevent="submit">
      <header
        class="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700"
      >
        <div class="min-w-0">
          <p class="text-xs font-semibold tracking-[0.14em] text-[#2768CA] uppercase">
            Câmera selecionada
          </p>
          <h2 id="camera-management-editor-title" class="mt-1 line-clamp-2 text-xl font-semibold">
            Editar {{ camera.description }}
          </h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {{ cameraAddressLabel(camera) }}
          </p>
        </div>
        <button
          ref="closeButton"
          type="button"
          class="grid size-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-[#2768CA] dark:hover:bg-slate-800"
          aria-label="Fechar edição"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </header>

      <div><CameraStatusBadge :camera="camera" /></div>

      <p
        v-if="error"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
      >
        {{ error }}
      </p>

      <p
        v-if="territorialWarning"
        role="status"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      >
        {{ territorialWarning }}
      </p>

      <label class="grid gap-1 text-sm font-semibold">
        Estado operacional
        <select
          v-model="form.status"
          class="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-600"
        >
          <option
            value="ACTIVE"
            :disabled="cameraStatusOptionDisabled(camera, 'ACTIVE')"
          >
            Ativa — transmissão e análise
          </option>
          <option
            value="OFFLINE"
            :disabled="cameraStatusOptionDisabled(camera, 'OFFLINE')"
          >
            Offline — somente transmissão
          </option>
          <option value="INACTIVE">Inativa — sem transmissão e análise</option>
        </select>
      </label>

      <fieldset class="grid gap-4">
        <legend class="mb-3 font-semibold">Identificação e transmissão</legend>
        <label class="grid gap-1 text-sm font-medium">
          Descrição
          <input
            v-model="form.description"
            required
            maxlength="255"
            class="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-600"
          />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Link HLS
          <input
            v-model="form.videoHls"
            :required="form.status !== 'INACTIVE'"
            type="url"
            class="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-600"
            placeholder="https://…/playlist.m3u8"
          />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Link de incorporação (opcional)
          <input
            v-model="form.videoEmbed"
            type="url"
            class="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3 dark:border-slate-600"
            placeholder="https://…"
          />
        </label>
      </fieldset>

      <section class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 class="font-semibold">Localização da câmera</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ cameraAddressLabel(camera) }}
        </p>
        <button
          type="button"
          class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#2768CA] px-4 py-2 font-semibold text-[#2768CA]"
          @click="emit('editLocation')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">edit_location_alt</span>
          {{ hasCoordinates ? 'Alterar no mapa' : 'Adicionar localização' }}
        </button>
      </section>

      <footer
        class="sticky bottom-0 -mx-5 flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-[#001C3B] lg:static lg:mx-0 lg:px-0 lg:pb-0"
      >
        <button
          type="button"
          class="min-h-11 rounded-xl px-4 font-semibold"
          :disabled="saving || !isDirty"
          @click="resetForm"
        >
          Descartar
        </button>
        <button
          type="submit"
          class="min-h-11 rounded-xl bg-[#2768CA] px-5 font-semibold text-white disabled:opacity-60"
          :disabled="saving || !isDirty"
        >
          {{ saving ? 'Salvando…' : 'Salvar alterações' }}
        </button>
      </footer>
    </form>

    <CameraMonitoringTimeline :key="camera.id" :camera-id="camera.id" />
  </section>
</template>
