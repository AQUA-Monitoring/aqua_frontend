<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { switchLocalePath, useI18n, type AppLocale } from '@/app/i18n'

const route = useRoute()
const { locale, t } = useI18n()
const choices: { value: AppLocale; label: string }[] = [
  { value: 'pt-BR', label: 'PT' },
  { value: 'en', label: 'EN' },
]
const pathFor = (value: AppLocale) => ({
  path: switchLocalePath(route.path, value),
  query: route.query,
  hash: route.hash,
})
const current = computed(() => locale.value)
</script>

<template>
  <nav :aria-label="t('language.label')" class="inline-flex rounded-full border border-current/20 p-1 text-xs font-semibold">
    <RouterLink
      v-for="choice in choices"
      :key="choice.value"
      :to="pathFor(choice.value)"
      :lang="choice.value"
      :aria-current="current === choice.value ? 'page' : undefined"
      class="rounded-full px-2.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
      :class="current === choice.value ? 'bg-[#2768CA] text-white' : ''"
    >{{ choice.label }}</RouterLink>
  </nav>
</template>
