<script setup lang="ts">
import { LanguageSwitcher } from '@/shared'
import { useI18n } from '@/app/i18n'

const { t, localePath, isEnglish } = useI18n()
const capabilities = [
  ['map', 'about.mapTitle', 'about.mapText'],
  ['videocam', 'about.cameraTitle', 'about.cameraText'],
  ['notifications_active', 'about.alertTitle', 'about.alertText'],
] as const
</script>

<template>
  <article class="mx-auto grid w-full max-w-6xl gap-16 px-5 py-10 sm:px-8 lg:py-16">
    <section class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#00182F] via-[#0750AF] to-[#28A9E0] px-6 py-10 text-white shadow-xl sm:px-10 lg:px-16 lg:py-16">
      <div v-if="isEnglish" class="absolute right-6 top-6"><LanguageSwitcher /></div>
      <p class="mb-3 max-w-2xl text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">{{ t('about.eyebrow') }}</p>
      <h1 class="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{{ t('about.title') }}</h1>
      <p class="mt-6 max-w-3xl text-lg leading-relaxed text-blue-50">{{ t('about.intro') }}</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <RouterLink :to="localePath('/')" class="rounded-full bg-white px-5 py-3 font-semibold text-[#0750AF]">{{ t('about.explore') }}</RouterLink>
        <RouterLink :to="localePath('/cameras')" class="rounded-full border border-white/60 px-5 py-3 font-semibold">{{ t('about.cameras') }}</RouterLink>
        <RouterLink :to="localePath('/demo')" class="rounded-full border border-white/60 px-5 py-3 font-semibold">{{ t('about.demo') }}</RouterLink>
      </div>
    </section>

    <section class="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
      <h2 class="text-3xl font-bold text-[#0750AF] dark:text-cyan-300">{{ t('about.purposeTitle') }}</h2>
      <p class="text-lg leading-relaxed text-slate-700 dark:text-slate-200">{{ t('about.purpose') }}</p>
    </section>

    <section>
      <h2 class="mb-7 text-3xl font-bold">{{ t('about.capabilitiesTitle') }}</h2>
      <div class="grid gap-5 md:grid-cols-3">
        <section v-for="item in capabilities" :key="item[0]" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-[#001C3B]">
          <span class="material-symbols-outlined text-4xl text-[#2768CA]" aria-hidden="true">{{ item[0] }}</span>
          <h3 class="mt-4 text-xl font-bold">{{ t(item[1]) }}</h3>
          <p class="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">{{ t(item[2]) }}</p>
        </section>
      </div>
    </section>

    <section class="grid gap-8 rounded-3xl bg-slate-100 p-7 md:grid-cols-2 lg:p-10 dark:bg-[#001C3B]">
      <div><h2 class="text-3xl font-bold">{{ t('about.projectTitle') }}</h2><p class="mt-4 leading-relaxed">{{ t('about.project') }}</p></div>
      <div class="grid content-start gap-5"><p class="leading-relaxed">{{ t('about.partner') }}</p><div><h3 class="font-bold">{{ t('about.contact') }}</h3><a class="text-[#2768CA] underline dark:text-cyan-300" href="mailto:aqua.monitoramentogestao@gmail.com">aqua.monitoramentogestao@gmail.com</a></div><div><h3 class="font-bold">{{ t('about.follow') }}</h3><a class="mr-4 text-[#2768CA] underline dark:text-cyan-300" href="https://www.instagram.com/aqua.monitoramento/">Instagram</a><a class="text-[#2768CA] underline dark:text-cyan-300" href="https://www.facebook.com/share/1BVMcTY5sW/">Facebook</a></div></div>
    </section>
  </article>
</template>
