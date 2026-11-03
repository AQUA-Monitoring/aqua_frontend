<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { CameraWithPrediction } from '@/modules/forecast'
import { legacyCameraAnalysisLabel } from '../utils/cameraPresentation'
import { localePath } from '@/app/i18n'

defineProps<{ cam: CameraWithPrediction }>()
const router = useRouter()
</script>

<template>
  <article
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#001C3B]"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-[0.12em] text-[#2768CA] uppercase">
          Análise automática
        </p>
        <h2 class="mt-1 font-semibold">{{ cam.name }}</h2>
      </div>
      <span class="material-symbols-outlined text-[#2768CA]">videocam</span>
    </div>
    <p class="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold dark:bg-[#071F36]">
      {{ legacyCameraAnalysisLabel(cam) }}
    </p>
    <p class="mt-3 text-sm text-slate-500">
      Estado administrativo: {{ cam.status === 'ACTIVE' ? 'Ativa' : 'Inativa' }}
    </p>
    <button
      type="button"
      class="mt-5 min-h-11 w-full rounded-xl bg-[#2768CA] px-4 font-semibold text-white"
      @click="router.push(localePath(`/cameras/${cam.id}`))"
    >
      Inspecionar
    </button>
  </article>
</template>
