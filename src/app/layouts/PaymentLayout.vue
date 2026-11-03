<script setup lang="ts">
import { HeaderComp, MobileMenu } from '@/shared'
import { useNavigationAuth } from '@/app/composables/useNavigationAuth'

const navigationAuth = useNavigationAuth()
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden">
    <HeaderComp :title="$t(String($route.meta.titleKey ?? ''))" v-bind="navigationAuth" />
    <main class="min-h-[64vh] grid lg:px-20 pt-20 pb-30 lg:py-0">
      <RouterView />
      <MobileMenu :title="$t(String($route.meta.titleKey ?? ''))" :user-type="navigationAuth.userType" />
    </main>
    <div
      class="absolute hidden md:block -bottom-10 -z-10 w-full h-full pointer-events-none bg-contain bg-bottom bg-no-repeat"
      style="background-image: url('/layouts/wavesPayment.svg')"
    ></div>
    <div
      class="absolute bottom-0 left-0 -z-10 w-full h-full bg-contain bg-bottom bg-no-repeat md:hidden pointer-events-none"
      style="background-image: url('/layouts/wavesMobile.svg')"
    ></div>
  </div>
</template>
