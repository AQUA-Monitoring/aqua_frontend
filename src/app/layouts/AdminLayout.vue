<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue3-toastify'
import { HeaderComp, FooterComp, MobileMenu } from '@/shared'
import { useFloodPointOfflineQueue, useFloodPointsStore } from '@/modules/flood-points'
import type { IMenu } from '@/shared'
import { useNavigationAuth } from '@/app/composables/useNavigationAuth'
import { REFERENCE_BASE_TEXT } from '@/modules/addressing'
import { useI18n } from '@/app/i18n'

const navigationAuth = useNavigationAuth()
const { t, localePath } = useI18n()

const offlineQueue = useFloodPointOfflineQueue()
const floodPointsStore = useFloodPointsStore()

const syncPendingAlerts = async () => {
  const result = await offlineQueue.flush()
  if (result.synced) {
    await floodPointsStore.refresh()
    toast.success(
      `${result.synced} alerta${result.synced > 1 ? 's' : ''} sincronizado${result.synced > 1 ? 's' : ''}.`,
    )
  }
  if (result.referenceBaseConflict) toast.error(REFERENCE_BASE_TEXT.changed)
  else if (result.errorMessage) toast.error(result.errorMessage)
}

onMounted(() => {
  window.addEventListener('online', syncPendingAlerts)
  syncPendingAlerts()
})

onBeforeUnmount(() => window.removeEventListener('online', syncPendingAlerts))

const menu = computed<IMenu>(() => ({
  id: 'menu',
  options: [
    {
      label: t('nav.home'),
      icon: 'home',
      link: localePath('/admin'),
    },
    {
      label: 'Cadastre um novo ponto de alagamento',
      icon: 'add',
      link: localePath('/admin/registrar-ponto'),
    },
    {
      label: 'Cadastrar nova câmera',
      icon: 'videocam',
      link: localePath('/admin/cameras/cadastro'),
    },
    {
      label: t('route.manageCameras'),
      icon: 'video_settings',
      link: localePath('/admin/cameras'),
    },
    {
      label: t('route.intelligence'),
      icon: 'model_training',
      link: localePath('/admin/inteligencia'),
    },
    {
      label: t('route.alerts'),
      icon: 'notifications_active',
      link: localePath('/admin/alertas'),
    },
  ],
}))
const route = useRoute()
const activeLink = computed(() =>
  [...menu.value.options]
    .sort((a, b) => b.link.length - a.link.length)
    .find((item) => route.path === item.link || route.path.startsWith(`${item.link}/`))?.link,
)
const shortLabels = ['Início', 'Novo ponto', 'Nova câmera', 'Câmeras', 'Inteligência', 'Alertas']
</script>

<template>
  <div class="min-h-dvh">
    <HeaderComp :title="$t(String($route.meta.titleKey ?? ''))" v-bind="navigationAuth" />
    <main
      class="relative mx-auto grid min-h-[64vh] w-full grid-cols-1 items-start gap-6 px-4 pb-30 sm:px-6 md:pb-10 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-6 lg:px-8"
    >
      <nav
        aria-label="Menu da administração"
        class="min-w-0 rounded-3xl bg-[#0453AF] p-2 text-white lg:self-stretch"
      >
        <ul class="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:sticky lg:top-6 lg:grid-cols-1 lg:gap-3 lg:py-3">
          <li v-for="(item, index) in menu.options" :key="item.link" class="min-w-0">
            <RouterLink
              :to="item.link"
              :aria-label="item.label"
              :title="item.label"
              :aria-current="activeLink === item.link ? 'page' : undefined"
              :class="{ 'bg-white/20': activeLink === item.link }"
              class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center lg:min-h-11 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
              <span class="text-[11px] leading-tight lg:sr-only">{{ shortLabels[index] }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="min-w-0">
        <RouterView />
      </div>
    </main>
    <MobileMenu :title="$t(String($route.meta.titleKey ?? ''))" :user-type="navigationAuth.userType" />
    <FooterComp />
  </div>
</template>
