<script setup lang="ts">
import { HeaderComp, MobileMenu } from '@/shared'
import { useNavigationAuth } from '@/app/composables/useNavigationAuth'

const navigationAuth = useNavigationAuth()
</script>

<template>
  <div class="relative isolate min-h-dvh overflow-hidden">
    <HeaderComp :title="String($route.name)" v-bind="navigationAuth" />
    <main class="min-h-[64vh] grid lg:px-20 pt-20 pb-30 lg:py-0">
      <RouterView />
      <MobileMenu :title="String($route.name)" :user-type="navigationAuth.userType" />
    </main>
    <div
      class="absolute bottom-0 left-0 -z-10 w-full h-full bg-contain bg-bottom bg-no-repeat lg:hidden pointer-events-none"
      style="background-image: url('/layouts/wavesMobile.svg')"
    ></div>
  </div>
</template>
