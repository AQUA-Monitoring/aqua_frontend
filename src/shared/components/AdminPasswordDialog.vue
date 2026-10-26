<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  title: string
  description: string
  busy: boolean
  error?: string
  notifications?: boolean
  finishedAt?: string
}>()
const emit = defineEmits<{
  cancel: []
  confirm: [value: { password: string; notify: boolean; finishedAt: string }]
}>()
const dialog = ref<HTMLDialogElement>()
const password = ref('')
const notify = ref(false)
const finishedAt = ref(props.finishedAt ?? '')
onMounted(() => dialog.value?.showModal())
function submit() {
  if (props.busy || !password.value) return
  const value = {
    password: password.value,
    notify: notify.value,
    finishedAt: finishedAt.value,
  }
  password.value = ''
  emit('confirm', value)
}
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="admin-password-title"
    class="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 dark:bg-[#001C3B] dark:text-white"
    @cancel.prevent="!busy && emit('cancel')"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <h2 id="admin-password-title" class="text-xl font-semibold">
        {{ title }}
      </h2>
      <p class="text-sm">{{ description }}</p>
      <label v-if="props.finishedAt !== undefined" class="grid gap-2 text-sm font-semibold">
        Nova data e hora de término
        <input
          v-model="finishedAt"
          type="datetime-local"
          required
          :disabled="busy"
          class="min-h-11 rounded-xl border border-slate-400 bg-transparent px-3"
        />
      </label>
      <label v-if="notifications" class="flex items-center gap-2 text-sm">
        <input v-model="notify" type="checkbox" :disabled="busy" />
        Emitir notificação sobre esta alteração
      </label>
      <label class="grid gap-2 text-sm font-semibold">
        Sua senha
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          autofocus
          :disabled="busy"
          class="min-h-11 rounded-xl border border-slate-400 bg-transparent px-3"
        />
      </label>
      <p v-if="error" role="alert" class="text-sm text-red-700 dark:text-red-300">
        {{ error }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="busy"
          class="min-h-11 rounded-xl px-4 disabled:opacity-50"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="busy || !password"
          class="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white disabled:opacity-50"
        >
          {{ busy ? 'Processando…' : 'Confirmar' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
