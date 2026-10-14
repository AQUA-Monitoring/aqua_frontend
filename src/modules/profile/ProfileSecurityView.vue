<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseForm } from '@/shared'
import type { FormValues, IFormField } from '@/shared'
import { useAuthStore } from '@/modules/auth'
import { toast } from 'vue3-toastify'

const authStore = useAuthStore()
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

onMounted(async () => {
  if (!authStore.user) {
    try {
      await authStore.getMe()
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Nao foi possivel carregar seus dados.'))
    }
  }
})

const nameField = computed<IFormField>(() => ({
  id: 'name',
  label: 'Atualizar nome',
  fields: [
    {
      id: 'name',
      message: `Nome atual: ${authStore.user?.name ?? '-'}`,
      placeholder: 'Digite seu nome aqui',
      type: 'text',
      autocomplete: 'name',
    },
  ],
  buttonText: 'Atualizar nome',
}))

const emailField = computed<IFormField>(() => ({
  id: 'email',
  label: 'Email',
  fields: [
    {
      id: 'email',
      message: `E-mail atual: ${authStore.user?.email ?? '-'}`,
      placeholder: 'Seu email esta vinculado a conta',
      type: 'email',
      autocomplete: 'email',
    },
  ],
}))

const securityFields: IFormField[] = [
  {
    id: 'update-password',
    label: 'Atualizar senha',
    fields: [
      {
        id: 'password',
        label: 'Senha atual',
        placeholder: 'Digite sua senha atual aqui',
        type: 'password',
        autocomplete: 'new-password',
      },
      {
        id: 'new-password',
        label: 'Nova senha',
        placeholder: 'Digite sua nova senha aqui',
        type: 'password',
        autocomplete: 'new-password',
      },
      {
        id: 'password-confirm',
        label: 'Confirme a sua senha',
        placeholder: 'Confirme a sua senha aqui',
        type: 'password',
        autocomplete: 'new-password',
      },
    ],
    buttonText: 'Atualizar senha',
  },
  {
    id: 'delete',
    label: 'Excluir conta',
    fields: [
      {
        id: 'password',
        placeholder: 'Digite sua senha aqui',
        type: 'password',
        autocomplete: 'new-password',
      },
    ],
    buttonText: 'Excluir conta',
    isDeleteButton: true,
  },
]

async function handleUpdateName(values: FormValues) {
  const name = typeof values.name === 'string' ? values.name : ''
  if (!name) return
  try {
    await authStore.updateMe({ name })
    toast.success('Nome atualizado com sucesso.')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'Nao foi possivel atualizar o nome.'))
  }
}
</script>

<template>
  <section class="profile-security min-w-0 py-6" aria-labelledby="security-title">
    <header class="mb-6">
      <h1 id="security-title" class="text-2xl font-semibold">Segurança</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Gerencie os dados e a segurança da sua conta.
      </p>
    </header>

    <div class="grid min-w-0 items-start gap-6 xl:grid-cols-2">
      <section class="security-card grid gap-6" aria-label="Dados da conta">
        <BaseForm
          :form-fields="[nameField]"
          :button-text="nameField.buttonText"
          :is-delete-button="nameField.isDeleteButton"
          @submit="handleUpdateName"
        />

        <div class="security-email min-w-0 border-t border-slate-200 pt-6 dark:border-slate-700">
          <BaseForm
            :form-fields="[emailField]"
            :button-text="emailField.buttonText"
            :is-delete-button="emailField.isDeleteButton"
          />
        </div>
      </section>

      <section
        v-for="section in securityFields"
        :key="section.id"
        class="security-card"
        :class="{ 'security-card--danger xl:col-span-2': section.isDeleteButton }"
        :aria-label="section.label"
      >
        <BaseForm
          :form-fields="[section]"
          :button-text="section.buttonText"
          :is-delete-button="section.isDeleteButton"
        />
      </section>
    </div>
  </section>
</template>

<style scoped>
.security-card {
  min-width: 0;
  padding: 1.5rem;
  border: 1px solid #dbe3ed;
  border-radius: 1.25rem;
  background: #fff;
}

.security-card :deep(h1:empty) {
  display: none;
}

.security-card :deep(form) {
  width: 100%;
  min-width: 0;
}

.security-card :deep(form > div:last-child) {
  margin-inline: 0;
}

.security-email :deep(form > div:first-child) {
  margin-bottom: 0;
}

.security-card :deep(p) {
  overflow-wrap: anywhere;
}

.security-card :deep(input) {
  min-width: 0;
}

.security-card :deep(button[type='submit']) {
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  margin-inline: 0;
  padding-inline: 1.25rem;
  font-size: 0.875rem;
}

.security-card--danger {
  border-color: #f1cbd0;
}

.security-card--danger :deep(h2) {
  color: #a13240;
}

@media (min-width: 640px) {
  .security-card :deep(button[type='submit']) {
    width: auto;
    min-width: min(12rem, 100%);
  }

  .security-card--danger :deep(form) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 1.25rem;
  }

  .security-card--danger :deep(form > div:first-child) {
    margin-bottom: 0;
  }
}

@media (max-width: 479px) {
  .security-card {
    padding: 1rem;
  }
}

.dark .security-card {
  border-color: #314760;
  background: #102b47;
}

.dark .security-card--danger {
  border-color: #7a4654;
}

.dark .security-card--danger :deep(h2) {
  color: #ffadb6;
}
</style>
