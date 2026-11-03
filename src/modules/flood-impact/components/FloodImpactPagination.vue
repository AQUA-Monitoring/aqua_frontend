<script setup lang="ts">
import { formatLocale } from '@/app/i18n'
import type { PageState } from '../types/floodImpact'

defineProps<{
  page: PageState
  disabled?: boolean
  label: string
}>()

const emit = defineEmits<{ change: [page: number] }>()
</script>

<template>
  <nav v-if="page.count > 0" class="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700" :aria-label="label">
    <p class="text-slate-600 dark:text-slate-300">
      Página {{ page.page }} · {{ page.count.toLocaleString(formatLocale()) }} resultado(s)
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600"
        :disabled="disabled || !page.previous"
        @click="emit('change', page.page - 1)"
      >
        Anterior
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600"
        :disabled="disabled || !page.next"
        @click="emit('change', page.page + 1)"
      >
        Próxima
      </button>
    </div>
  </nav>
</template>
