<script setup lang="ts">
import { BaseForm } from '@/shared'
import type { FormValues, IFormField } from '@/shared'

const emit = defineEmits(['submit', 'toggle'])

defineProps<{
  recoveryFields: IFormField[]
}>()

const onSubmit = (values: FormValues) => {
  emit('submit', values)
  emit('toggle')
}
</script>

<template>
  <div class="lg:ml-auto lg:my-[25vh] lg:w-[35vw] px-10">
    <h1 class="font-semibold text-2xl text-center mb-5 hidden lg:block">Recuperação</h1>

    <p class="text-center mb-8">
      {{ $l('Informe o email da sua conta para receber um código de recuperação.', 'Enter your account email to receive a recovery code.') }}
    </p>
    <div class="flex justify-center">
      <BaseForm :form-fields="recoveryFields" button-text="Continuar" @submit="onSubmit" />
    </div>
  </div>
</template>
