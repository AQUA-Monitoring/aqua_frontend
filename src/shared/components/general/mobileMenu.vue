<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScreenSize } from '@/shared'
import { useI18n } from '@/app/i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'

const props = defineProps<{ title?: string; userType?: string | null }>()
const { isMobile } = useScreenSize()
const { t, localePath } = useI18n()

interface Menu {
  icon: string
  label: string
  link?: string
  options?: {
    label: string
    icon: string
    link: string
  }[]
}

const menubar = computed<Menu[]>(() => {
  const items: Menu[] = [
    {
      label: t('nav.menu'),
      icon: 'add',
      options: [
        { label: t('nav.demo'), icon: 'live_tv', link: localePath('/demo') },
        { label: t('nav.blog'), icon: 'docs', link: localePath('/blog') },
        { label: t('nav.cameras'), icon: 'camera_outdoor', link: localePath('/cameras') },
        { label: t('nav.donate'), icon: 'savings', link: localePath('/doacao') },
        { label: t('nav.support'), icon: 'contact_support', link: localePath('/suporte') },
      ],
    },
    { label: t('nav.home'), icon: 'home', link: localePath('/') },
    { label: t('nav.profile'), icon: 'person', link: localePath('/seguranca') },
  ]

  if (props.userType === 'admin') {
    items.push({
      label: t('nav.admin'),
      icon: 'dashboard',
      link: localePath('/admin'),
    })
  }

  return items
})

const openMenuId = ref<number | null>(null)
const toggleMenu = (id: number) => {
  openMenuId.value = openMenuId.value === id ? null : id
}

const getSemiCircleStyle = (index: number, total: number) => {
  const angle = 90 + ((150 - 90) / (total - 1)) * index //90 = startAngle; 150 = endAngle
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * 170 // 170 = raio
  const y = Math.sin(rad) * 170

  return {
    right: `${30 + x}px`,
    bottom: `${y}px`,
  }
}
</script>

<template>
  <transition name="overlay">
    <div
      v-if="openMenuId !== null"
      class="fixed inset-0 z-40 bg-white/60 backdrop-blur-[2px]"
      @click="openMenuId = null"
    >
      <div class="absolute right-5 bottom-28 rounded-full bg-white p-1 text-slate-700 shadow-lg dark:bg-[#001C3B] dark:text-white" @click.stop>
        <LanguageSwitcher />
      </div>
    </div>
  </transition>

  <nav
    v-if="isMobile"
    class="fixed bottom-2 z-50 left-1/2 -translate-x-1/2 w-[90%] max-w-sm rounded-full bg-white py-5 text-[#999999] shadow-xl dark:bg-[#001C3B]"
  >
    <ul class="flex items-center justify-around">
      <li v-for="(item, index) in menubar" :key="index">
        <RouterLink
          v-if="!item.options && item.link"
          :to="item.link"
          :class="[item.label == title ? 'text-[#2768CA]' : '', 'active:text-[#2768CA]']"
        >
          <p class="flex flex-col items-center">
            <span class="material-symbols-outlined">
              {{ item.icon }}
            </span>
            {{ item.label }}
          </p>
        </RouterLink>

        <div v-else class="relative">
          <button
            @click="toggleMenu(index)"
            :aria-expanded="openMenuId === index"
            class="active:text-[#2768CA]"
          >
            <p class="flex flex-col items-center">
              <span class="material-symbols-outlined">
                {{ item.icon }}
              </span>
              {{ item.label }}
            </p>
          </button>

          <TransitionGroup name="fab" v-if="item.options">
            <RouterLink
              v-for="(option, optionIndex) in item.options"
              v-show="openMenuId === index"
              :key="option.icon"
              :to="option.link"
              class="absolute flex h-14 w-14 items-center justify-center rounded-full bg-[#2768CA] text-white shadow-xl active:bg-[#7AA6C8]"
              :style="getSemiCircleStyle(optionIndex, item.options.length)"
              @click="openMenuId = null"
            >
              <span class="material-symbols-outlined">
                {{ option.icon }}
              </span>
            </RouterLink>
          </TransitionGroup>
        </div>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.fab-enter-active,
.fab-leave-active {
  transition: all 0.3s ease;
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}

.fab-enter-to,
.fab-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* overlay */

.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.25s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.overlay-enter-to,
.overlay-leave-from {
  opacity: 1;
  backdrop-filter: blur(2px);
}
</style>
