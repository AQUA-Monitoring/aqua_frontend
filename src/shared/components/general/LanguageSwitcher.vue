<script setup lang="ts">
import { useRoute } from 'vue-router'
import { switchLocalePath, useI18n, type AppLocale } from '@/app/i18n'

const route = useRoute()
const { locale, t } = useI18n()
const choices: { value: AppLocale; label: string; labelKey: string; flag: string }[] = [
  { value: 'pt-BR', label: 'PT', labelKey: 'language.portuguese', flag: '/icons/flags/br.svg' },
  { value: 'en', label: 'EN', labelKey: 'language.english', flag: '/icons/flags/us.svg' },
]
const pathFor = (value: AppLocale) => ({
  path: switchLocalePath(route.path, value),
  query: route.query,
  hash: route.hash,
})
</script>

<template>
  <nav :aria-label="t('language.label')" class="relative inline-grid shrink-0 grid-cols-2 gap-0.5 rounded-full border border-current/20 bg-slate-500/10 p-0.5 align-middle text-[11px] font-semibold">
    <span aria-hidden="true" class="language-indicator pointer-events-none absolute inset-y-0.5 left-0.5 w-14 rounded-full bg-[#2768CA] shadow-sm" :class="locale === 'en' ? 'translate-x-14.5' : 'translate-x-0'" />
    <RouterLink
      v-for="choice in choices"
      :key="choice.value"
      :to="pathFor(choice.value)"
      :lang="choice.value"
      :aria-label="t(choice.labelKey)"
      :title="t(choice.labelKey)"
      :aria-current="locale === choice.value ? 'page' : undefined"
      class="language-option relative flex min-h-9 w-14 items-center justify-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA] pointer-coarse:min-h-11"
      :class="locale === choice.value ? 'text-white' : 'opacity-70 hover:opacity-100'"
    >
      <img :src="choice.flag" alt="" aria-hidden="true" width="18" height="12" class="h-3 w-4.5 rounded-[2px] object-cover shadow-sm" />
      <span aria-hidden="true">{{ choice.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.language-indicator { transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.language-option { transition: color 250ms ease, opacity 250ms ease; }
@media (prefers-reduced-motion: reduce) {
  .language-indicator, .language-option { transition: none; }
}
</style>
