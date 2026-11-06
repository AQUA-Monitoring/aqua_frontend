<script setup lang="ts">
import { useRoute } from 'vue-router'
import { switchLocalePath, useI18n, type AppLocale } from '@/app/i18n'

const route = useRoute()
const { locale, t } = useI18n()
const choices: { value: AppLocale; labelKey: string; flag: string }[] = [
  { value: 'pt-BR', labelKey: 'language.portuguese', flag: '/icons/flags/br.svg' },
  { value: 'en', labelKey: 'language.english', flag: '/icons/flags/us.svg' },
]
const pathFor = (value: AppLocale) => ({
  path: switchLocalePath(route.path, value),
  query: route.query,
  hash: route.hash,
})
</script>

<template>
  <nav :aria-label="t('language.label')" class="language-switcher relative inline-grid shrink-0 grid-cols-2 gap-1 rounded-full border border-current/15 bg-slate-500/10 p-1 align-middle">
    <span aria-hidden="true" class="language-indicator pointer-events-none absolute inset-y-1 left-1 w-11 rounded-full bg-white shadow-sm dark:bg-[#2768CA]" :class="locale === 'en' ? 'translate-x-12' : 'translate-x-0'" />
    <RouterLink
      v-for="choice in choices"
      :key="choice.value"
      :to="pathFor(choice.value)"
      :lang="choice.value"
      :aria-label="t(choice.labelKey)"
      :title="t(choice.labelKey)"
      :aria-current="locale === choice.value ? 'page' : undefined"
      class="language-option relative grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
      :class="locale === choice.value ? 'scale-100 opacity-100' : 'scale-90 opacity-65 hover:scale-100 hover:opacity-100'"
    ><img :src="choice.flag" alt="" aria-hidden="true" width="26" height="20" class="h-5 w-6.5 rounded-[3px] object-cover shadow-sm" /></RouterLink>
  </nav>
</template>

<style scoped>
.language-indicator { transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.language-option { transition: transform 250ms ease, opacity 250ms ease; }
@media (prefers-reduced-motion: reduce) {
  .language-indicator, .language-option { transition: none; }
}
</style>
