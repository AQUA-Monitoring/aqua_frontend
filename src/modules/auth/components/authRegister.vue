<script setup lang="ts">
import { BaseForm } from '@/shared'
import GoogleAuthButton from './GoogleAuthButton.vue'
import type { FormValues, IFormField } from '@/shared'

const emit = defineEmits(['submit', 'toggle'])

defineProps<{
  registerFields: IFormField[]
}>()

const onRegister = (values: FormValues) => {
  emit('submit', values)
}

const onToggle = () => {
  emit('toggle')
}
</script>

<template>
  <div class="grid justify-between lg:flex lg:h-screen lg:px-[15vw]">
    <div class="my-auto hidden gap-5 text-center text-white lg:grid">
      <h3 class="text-4xl font-semibold">Bem-vindo!</h3>
      <p class="w-83 font-semibold">
        Que bom que você voltou. Faça o login e continue a aproveitando os benefícios do AQUA
      </p>
      <button
        @click="onToggle"
        class="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-transparent bg-[#7AA6C8]/30 px-10 py-2 font-semibold shadow-xl backdrop-blur-xs"
      >
        Entrar <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>

    <div class="grid justify-center lg:my-auto">
      <BaseForm
        title="Cadastro"
        :form-fields="registerFields"
        button-text="Continuar"
        :is-auth-form="true"
        @submit="onRegister"
      />

      <GoogleAuthButton mode="register" />
      <button @click="onToggle" class="mb-3 mt-10 text-center text-xs lg:hidden cursor-pointer">
        Você já tem conta? <span class="underline">Faça o login</span>
      </button>
    </div>
  </div>
</template>
