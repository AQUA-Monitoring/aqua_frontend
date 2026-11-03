<script setup lang="ts">
import { HeaderComp, FooterComp, MobileMenu } from '@/shared'
import { useNavigationAuth } from '@/app/composables/useNavigationAuth'

const navigationAuth = useNavigationAuth()
</script>

<template>
  <div class="min-h-dvh">
    <HeaderComp :title="$t(String($route.meta.titleKey ?? ''))" v-bind="navigationAuth" />
    <main class="min-h-[64vh] relative grid pb-30 md:pb-10 md:px-15 lg:px-20">
      <RouterView />
      <MobileMenu :title="$t(String($route.meta.titleKey ?? ''))" :user-type="navigationAuth.userType" />
    </main>
    <FooterComp />
  </div>
</template>
