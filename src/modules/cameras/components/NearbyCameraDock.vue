<script setup lang="ts">
import CameraPreview from './CameraPreview.vue'
import CameraStatusBadge from './CameraStatusBadge.vue'
import type { NearbyCameraItem } from '../types/camera'

withDefaults(
  defineProps<{
    cameras: NearbyCameraItem[]
    loading?: boolean
    error?: string | null
    vertical?: boolean
  }>(),
  { loading: false, error: null, vertical: false },
)
const emit = defineEmits<{ select: [camera: NearbyCameraItem] }>()

function distanceLabel(distance: number) {
  if (distance < 1000) return `${Math.round(distance)} m`
  return `${(distance / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}
</script>

<template>
  <section class="min-w-0" aria-label="Câmeras próximas">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold tracking-[0.14em] text-[#2768CA] uppercase">
          Navegação territorial
        </p>
        <h2 class="mt-1 text-lg font-semibold">Câmeras próximas</h2>
      </div>
      <span v-if="cameras.length" class="text-xs text-slate-500">{{ cameras.length }} opções</span>
    </div>

    <div
      v-if="loading"
      class="grid min-h-32 place-items-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-[#071F36]"
      aria-live="polite"
    >
      Buscando câmeras próximas...
    </div>
    <div
      v-else-if="error"
      class="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
    >
      {{ error }}
    </div>
    <div
      v-else-if="!cameras.length"
      class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700"
    >
      Nenhuma outra câmera foi encontrada neste raio.
    </div>
    <div
      v-else
      class="aqua-scrollbar gap-3 overflow-auto pb-2"
      :class="
        vertical ? 'grid max-h-[calc(100dvh-14rem)] grid-cols-1 pr-1' : 'flex snap-x snap-mandatory'
      "
      role="list"
    >
      <article
        v-for="item in cameras"
        :key="item.id"
        class="snap-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-[#001C3B]"
        :class="vertical ? 'w-full' : 'w-[min(78vw,260px)] shrink-0 sm:w-64'"
        role="listitem"
      >
        <CameraPreview :camera="item" />
        <div class="mt-3 flex items-start justify-between gap-2">
          <h3 class="line-clamp-2 text-sm font-semibold">{{ item.description }}</h3>
          <span
            class="shrink-0 rounded-full bg-[#2768CA]/10 px-2 py-1 text-xs font-semibold text-[#2768CA]"
            >{{ distanceLabel(item.distance_m) }}</span
          >
        </div>
        <div class="mt-2"><CameraStatusBadge :camera="item" /></div>
        <button
          type="button"
          class="mt-3 min-h-11 w-full rounded-xl border border-[#2768CA] px-3 text-sm font-semibold text-[#2768CA] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
          @click="emit('select', item)"
        >
          Abrir câmera
        </button>
      </article>
    </div>
  </section>
</template>
