<script setup lang="ts">
import CameraStatusBadge from './CameraStatusBadge.vue'
import type { CameraApiItem } from '../types/camera'
import { cameraAddressLabel, cameraCoordinates } from '../utils/cameraPresentation'

defineProps<{
  cameras: CameraApiItem[]
  selectedId?: string | null
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
}>()
const emit = defineEmits<{
  select: [camera: CameraApiItem]
  loadMore: []
}>()
</script>

<template>
  <div
    class="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-[#001C3B]"
  >
    <div v-if="loading" class="grid gap-3 p-2" role="status" aria-live="polite">
      <span class="sr-only">Carregando câmeras</span>
      <div
        v-for="item in 5"
        :key="item"
        class="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
      ></div>
    </div>

    <ul v-else class="grid gap-2" aria-label="Câmeras cadastradas">
      <li v-for="camera in cameras" :key="camera.id">
        <button
          type="button"
          class="w-full rounded-2xl border p-3 text-left transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
          :class="
            selectedId === camera.id
              ? 'border-[#2768CA] bg-blue-50 ring-3 ring-[#2768CA]/15 dark:bg-blue-950/30'
              : 'border-slate-200 hover:border-blue-300 dark:border-slate-700'
          "
          :aria-pressed="selectedId === camera.id"
          @click="emit('select', camera)"
        >
          <span class="flex items-start justify-between gap-3">
            <span class="min-w-0">
              <span class="block line-clamp-2 font-semibold">{{
                camera.description || 'Câmera sem descrição'
              }}</span>
              <span class="mt-1 block line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{
                cameraAddressLabel(camera)
              }}</span>
            </span>
            <span class="material-symbols-outlined shrink-0 text-[#2768CA]" aria-hidden="true"
              >videocam</span
            >
          </span>
          <span class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <CameraStatusBadge :camera="camera" />
            <span
              v-if="!cameraCoordinates(camera)"
              class="text-xs font-semibold text-amber-700 dark:text-amber-300"
              >Sem localização</span
            >
          </span>
          <span class="mt-2 block text-xs text-slate-500 dark:text-slate-400">
            {{
              camera.status === 'ACTIVE'
                ? 'Ativa · transmissão e análise habilitadas'
                : camera.status === 'OFFLINE'
                  ? 'Offline · somente transmissão'
                  : 'Inativa · transmissão e análise desabilitadas'
            }}
          </span>
        </button>
      </li>
    </ul>
    <p
      v-if="!loading && !cameras.length"
      class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
    >
      Nenhuma câmera encontrada com esses filtros.
    </p>

    <button
      v-if="hasMore && !loading"
      type="button"
      class="mt-3 min-h-11 w-full rounded-xl border border-[#2768CA] px-3 py-2 text-sm font-semibold text-[#2768CA] disabled:opacity-60 dark:text-blue-300"
      :disabled="loadingMore"
      @click="emit('loadMore')"
    >
      {{ loadingMore ? 'Carregando…' : 'Carregar mais câmeras' }}
    </button>
  </div>
</template>
