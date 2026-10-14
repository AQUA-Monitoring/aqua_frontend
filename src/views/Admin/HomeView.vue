<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CamerasComp, usePriorityCameras } from '@/modules/cameras'
import { SelectFloodAlert } from '@/components'
import { MapboxComp, TablePoints } from '@/modules/flood-map'
import type { AlertKey } from '@/types/alert'
import { useAuthStore } from '@/modules/auth'

import { useFloodPointsMap } from '@/modules/flood-points'
import { useNotificationsStore } from '@/modules/notifications'
const { user } = useAuthStore()
const { tablePoints } = useFloodPointsMap()
const { cameras, loading: camerasLoading, error: camerasError } = usePriorityCameras()

const currentAlert = ref<AlertKey>('CRISE!')
const notifications = useNotificationsStore()

onMounted(() => notifications.loadOpenCount().catch(() => undefined))
</script>

<template>
  <section class="grid min-w-0 gap-6 lg:gap-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="hidden text-3xl font-semibold lg:block xl:text-4xl">Área de Administração</h1>
        <p class="mt-2 text-lg font-semibold break-words text-[#0453AF] dark:text-blue-200">
          Bem-vindo, {{ user?.name }}!
        </p>
      </div>
    </header>

    <div class="grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <RouterLink
          to="/admin/alertas"
          class="flex items-center justify-between gap-3 rounded-2xl border border-[#2768CA]/30 bg-[#2768CA]/10 p-5 text-[#0750AF] dark:text-blue-200"
        >
          <span><strong class="block">Alertas operacionais</strong><small>Indícios aguardando revisão humana</small></span>
          <span class="shrink-0 rounded-full bg-[#2768CA] px-3 py-1 font-semibold text-white" :aria-label="`${notifications.openCount} indícios abertos`">{{ notifications.openCount }}</span>
        </RouterLink>
        <RouterLink
          to="/admin/inteligencia"
          class="rounded-2xl border border-[#2768CA]/30 bg-[#2768CA]/10 p-5 text-[#0750AF] dark:text-blue-200"
        >
          <strong class="block">Inteligência do monitoramento</strong>
          <small>Revisões, base de aprendizado, treinamentos e versões</small>
        </RouterLink>
        <div class="min-w-0 sm:col-span-2 xl:col-span-1">
          <TablePoints :points="tablePoints" />
        </div>
        <div class="min-w-0 sm:col-span-2 xl:col-span-1">
          <CamerasComp :cameras="cameras" :loading="camerasLoading" :error="camerasError" />
        </div>
      </div>
      <div class="admin-map-column flex min-w-0 flex-col">
        <SelectFloodAlert v-model:alert="currentAlert" />
        <MapboxComp class="admin-map" :cameras="cameras" :show-items="true" :show-desktop-info-panel="false" />
      </div>
    </div>

  </section>
</template>

<style scoped>
.admin-map {
  height: max(22rem, calc(100dvh - 12rem));
  min-height: 0;
}
@media (min-width: 80rem) {
  .admin-map-column {
    min-height: calc(100dvh - 12rem);
  }

  .admin-map {
    flex: 1 1 0;
    height: auto;
    min-height: 22rem;
  }
}
</style>
