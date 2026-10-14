<script setup lang="ts">
import { computed, ref } from 'vue'
import { type AlertKey, ALERTS } from '@/types/alert'

const alert = defineModel<AlertKey>('alert', {
  required: true,
})

const showAll = ref(false)
const selected = ref<AlertKey | null>(null)

const toggle = () => {
  showAll.value = !showAll.value
}

const currentAlert = computed(() => ALERTS.find((item) => item.title === alert.value) ?? ALERTS[0]!)
const otherAlerts = computed(() => ALERTS.filter((item) => item.title !== currentAlert.value.title))
const selectedAlert = computed(() => ALERTS.find((item) => item.title === selected.value) ?? null)

const confirmSelection = () => {
  if (!selectedAlert.value) return

  alert.value = selectedAlert.value.title

  selected.value = null
  showAll.value = false
}
</script>

<template>
  <div
    class="relative mb-5 w-full rounded-full bg-white shadow-lg lg:bg-transparent dark:bg-[#000D19] lg:dark:bg-transparent"
  >
    <button
      type="button"
      :aria-expanded="showAll"
      class="relative grid min-h-12 w-full cursor-pointer rounded-3xl px-10 py-2 text-center text-sm"
      :class="currentAlert.bgClass"
      @click="toggle"
    >
      <span class="text-md font-semibold">
        {{ currentAlert.title }}
      </span>

      {{ currentAlert.description }}

      <span class="material-symbols-outlined absolute top-3 right-2"> keyboard_arrow_down </span>
    </button>

    <transition name="fade">
      <div
        v-if="showAll"
        class="absolute left-0 right-0 z-20 mt-3 grid gap-3 rounded-lg bg-white px-5 pb-5 shadow-lg dark:bg-[#000D19]"
      >
        <label v-for="item in otherAlerts" :key="item.title" class="cursor-pointer">
          <input
            v-model="selected"
            type="radio"
            name="alert"
            :value="item.title"
            class="peer sr-only"
          />

          <p
            class="grid rounded-full p-1 text-center text-sm transition-all peer-checked:ring-2 peer-checked:ring-blue-500"
            :class="item.bgClass"
          >
            <span class="text-md font-semibold">
              {{ item.title }}
            </span>

            {{ item.description }}
          </p>
        </label>

        <div v-if="selectedAlert" class="pt-3">
          <p class="mb-2 text-xs lg:text-sm">Nível selecionado:</p>

          <p class="grid rounded-full p-1 text-center text-sm" :class="selectedAlert.bgClass">
            <span class="text-md font-semibold">
              {{ selectedAlert.title }}
            </span>

            {{ selectedAlert.description }}
          </p>

          <button
            class="mt-4 w-full cursor-pointer rounded-full bg-blue-500 p-2 font-semibold text-white shadow-xl transition hover:bg-blue-600"
            @click="confirmSelection"
          >
            Confirmar
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
