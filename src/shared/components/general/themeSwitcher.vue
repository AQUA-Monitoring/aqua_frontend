<script setup lang="ts">
import { useTheme } from '@/shared'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button :aria-label="isDark ? 'Ativar modo claro' : 'Ativar modo escuro'" @click="toggleTheme">
    <span
      class="material-symbols-outlined cursor-pointer text-gray-500 transition-all duration-300 ease-out lg:text-black dark:text-white"
      :class="[isDark ? 'scale-90 rotate-180 lg:scale-120' : 'scale-100 rotate-360 lg:scale-120']"
    >
      {{ isDark ? 'sunny' : 'bedtime' }}
    </span>
  </button>
</template>
