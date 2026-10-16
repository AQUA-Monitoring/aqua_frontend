<script setup lang="ts">
import { BaseForm } from '@/shared'
import GoogleAuthButton from './GoogleAuthButton.vue'
import type { FormValues, IFormField } from '@/shared'

const emit = defineEmits(['submit', 'toggle'])

defineProps<{
  loginFields: IFormField[]
}>()

const onLogin = (values: FormValues) => {
  emit('submit', values)
}

const onToggle = () => {
  emit('toggle')
}
</script>

<template>
  <div class="grid justify-between lg:flex lg:h-screen lg:px-[15vw]">
    <div class="my-auto grid justify-center">
      <BaseForm
        title="Entrar"
        :form-fields="loginFields"
        button-text="Entrar"
        :is-auth-form="true"
        @submit="onLogin"
      />

      <GoogleAuthButton />
      <button @click="onToggle" class="mb-3 mt-10 text-center text-xs lg:hidden cursor-pointer">
        Você ainda não tem conta? <span class="underline">Crie uma conta</span>
      </button>
    </div>

    <div class="my-auto hidden gap-5 text-center text-white lg:grid">
      <h3 class="text-4xl font-semibold">Não tem conta?</h3>
      <p class="w-83 font-semibold">
        Faça o cadastro agora e <span>aproveite todos os benefícios do </span><span>AQUA</span>
      </p>
      <button
        @click="onToggle"
        class="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-transparent bg-[#7AA6C8]/30 px-10 py-2 font-semibold shadow-xl backdrop-blur-xs"
      >
        Cadastre-se <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>
  </div>
</template>
