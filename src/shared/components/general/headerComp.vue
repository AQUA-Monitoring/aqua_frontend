<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { LanguageSwitcher, ThemeSwitcher } from '@/shared'
import { useScreenSize } from '@/shared'
import { useI18n } from '@/app/i18n'

const props = defineProps<{
  title?: string
  isAuthenticated?: boolean
  userType?: string | null
}>()

const router = useRouter()
const { isMobile } = useScreenSize()
const { t, localePath } = useI18n()
const openMenuId = ref<number | null>(null)
const toggleMenu = (id: number) => {
  openMenuId.value = openMenuId.value === id ? null : id
}

const allowedTitles = computed(() => [
  t('route.recovery'), t('route.registerPoint'), t('route.payment'), t('route.support'),
  t('nav.profile'), t('route.admin'),
])
const shouldShowTitle = computed(() => allowedTitles.value.includes(props.title ?? ''))

interface MenuItem {
  id: number
  label?: string
  link?: RouteLocationRaw
  img?: string
  icon?: string
  options?: { id: number; label: string; link: string }[]
}

const desktopMenu = computed<MenuItem[]>(() => [
  { id: 0, img: '/icons/aqua.svg', label: 'Aqua', link: localePath('/') },
  { id: 1, label: t('nav.home'), link: localePath('/') },
  { id: 2, label: t('nav.cameras'), link: localePath('/cameras') },
  {
    id: 3,
    label: t('nav.more'),
    options: [
      { id: 0, label: t('nav.demo'), link: localePath('/demo') },
      { id: 1, label: t('nav.blog'), link: localePath('/blog') },
      { id: 2, label: t('nav.donate'), link: localePath('/doacao') },
      { id: 3, label: t('nav.support'), link: localePath('/suporte') },
    ],
  },
])

const desktopMenuAccount = computed<MenuItem[]>(() => [
  { id: 0, label: t('nav.signIn'), link: { path: localePath('/auth'), query: { mode: 'login' } } },
  { id: 1, label: t('nav.signUp'), link: { path: localePath('/auth'), query: { mode: 'register' } } },
  { id: 2, icon: 'person', link: localePath('/seguranca') },
])

</script>

<template>
  <header
    v-if="!(isMobile && title === t('route.home'))"
    class="relative z-40 bg-transparent px-7 lg:bg-white lg:px-20 xl:px-25 py-3 dark:bg-[#00182F] dark:text-white"
  >
    <nav class="lg:flex lg:items-center lg:justify-between">
      <ul class="flex items-center justify-between lg:hidden">
        <li>
          <button class="material-symbols-outlined text-[#999999]" @click="router.back()">
            arrow_back_ios
          </button>
        </li>
        <li><img src="/icons/aqua.svg" alt="Aqua" class="ml-3" /></li>
        <li class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </li>
      </ul>

      <ul class="hidden items-center gap-7 lg:flex">
        <li
          v-for="item in desktopMenu"
          :key="item.id"
          :class="item.label == title ? 'text-[#2768CA]' : ''"
          class="relative cursor-pointer"
        >
          <RouterLink v-if="item.img" :to="item.link!">
            <img :src="item.img" :alt="item.label" class="h-15 w-15 object-contain" />
          </RouterLink>

          <RouterLink v-else-if="!item.options" :to="item.link!">
            {{ item.label }}
          </RouterLink>

          <div v-else>
            <button
              @click="toggleMenu(item.id)"
              :aria-expanded="openMenuId === item.id"
              class="flex cursor-pointer items-center"
            >
              {{ item.label }}
              <span
                class="material-symbols-outlined transition-all duration-300 ease-out"
                :class="openMenuId === item.id ? 'rotate-180' : 'rotate-0'"
                >keyboard_arrow_down</span
              >
            </button>
            <transition name="fade">
              <ul
                v-if="openMenuId === item.id"
                class="absolute -left-5 z-50 mt-2 grid w-[10vw] gap-2 rounded-lg bg-white px-5 py-5 shadow-lg dark:bg-[#000d19]"
              >
                <li
                  v-for="menu in item.options"
                  :key="menu.id"
                  class="border-b border-[#000D19] p-2 text-center dark:border-white"
                >
                  <RouterLink :to="menu.link">{{ menu.label }}</RouterLink>
                </li>
              </ul>
            </transition>
          </div>
        </li>
        <li
          v-if="userType === 'admin'"
          :class="t('route.admin') == title ? 'text-[#2768CA]' : ''"
          class="relative cursor-pointer"
        >
          <RouterLink :to="localePath('/admin')"> {{ t('nav.admin') }} </RouterLink>
        </li>
      </ul>

      <ul class="hidden items-center gap-7 lg:flex">
        <li
          v-for="item in desktopMenuAccount"
          :key="item.id"
          class="cursor-pointer"
          v-show="
            isAuthenticated
              ? item.icon !== undefined
              : item.id === 0 || item.id === 1
          "
        >
          <RouterLink v-if="item.icon" :to="item.link!">
            <span class="material-symbols-outlined lg:scale-140">{{ item.icon }}</span>
          </RouterLink>

          <RouterLink
            v-else
            :to="item.link!"
            :class="
              item.id === 1
                ? 'rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition-colors duration-300 hover:bg-blue-600'
                : ''
            "
          >
            {{ item.label }}
          </RouterLink>
        </li>
        <li>
          <ThemeSwitcher class="hidden lg:block" />
        </li>
        <li><LanguageSwitcher /></li>
      </ul>
    </nav>
  </header>

  <div v-if="shouldShowTitle" class="grid lg:hidden">
    <h1 class="text-center">{{ title }}</h1>
  </div>
</template>
