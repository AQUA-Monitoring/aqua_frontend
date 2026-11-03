<script setup lang="ts">
import { FooterComp, HeaderComp, MobileMenu } from '@/shared'
import { ProfileUser } from '@/modules/profile'
import { useNavigationAuth } from '@/app/composables/useNavigationAuth'

const navigationAuth = useNavigationAuth()
</script>

<template>
  <div class="min-h-dvh">
    <HeaderComp :title="$t(String($route.meta.titleKey ?? ''))" v-bind="navigationAuth" />
    <main
      class="mx-auto grid min-h-[64vh] w-full max-w-[1280px] grid-cols-1 items-start gap-6 px-4 pb-30 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pb-12"
    >
      <ProfileUser compact />
      <div class="min-w-0">
        <nav
          aria-label="Configurações do perfil"
          class="mt-5 flex flex-wrap gap-2"
        >
          <RouterLink
            :to="$localePath('/seguranca')"
            class="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            active-class="bg-[#2768CA] text-white"
            >{{ $t('nav.security') }}</RouterLink
          >
          <RouterLink
            :to="$localePath('/notificacoes')"
            class="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
            active-class="bg-[#2768CA] text-white"
            >{{ $t('nav.notifications') }}</RouterLink
          >
        </nav>
        <RouterView />
      </div>
    </main>
    <MobileMenu :title="$t(String($route.meta.titleKey ?? ''))" :user-type="navigationAuth.userType" />
    <FooterComp />
  </div>
</template>
