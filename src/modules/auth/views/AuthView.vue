<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import { AuthLogin, AuthRegister } from '../components'
import type { FormValues, IFormField } from '@/shared'
import { useScreenSize } from '@/shared'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
// const auth = useAuthController()
const { isDesktop } = useScreenSize()

const isLogin = ref(route.query.mode !== 'register')

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})

const loginFields: IFormField[] = [
  {
    id: 'email',
    label: 'Email',
    fields: [
      {
        id: 'email',
        placeholder: 'Digite seu email aqui',
        type: 'email',
      },
    ],
  },
  {
    id: 'password',
    label: 'Senha',
    fields: [
      {
        id: 'password',
        placeholder: 'Digite sua senha aqui',
        type: 'password',
      },
    ],
  },
]
const registerFields: IFormField[] = [
  {
    id: 'name',
    label: 'Nome',
    fields: [
      {
        id: 'name',
        placeholder: 'Digite seu nome aqui',
        type: 'text',
        autocomplete: 'name',
      },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    fields: [
      {
        id: 'email',
        placeholder: 'Digite seu email aqui',
        type: 'email',
        autocomplete: 'email',
      },
    ],
  },
  {
    id: 'password',
    label: 'Senha',
    fields: [
      {
        id: 'password',
        placeholder: 'Digite sua senha aqui',
        type: 'password',
        autocomplete: 'new-password',
      },
    ],
  },
]

const waveDirection = computed<'left' | 'right'>(() => {
  return isLogin.value ? 'right' : 'left'
})
function toggleWave() {
  isLogin.value = !isLogin.value
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
const stringValue = (value: FormValues[string]) => (typeof value === 'string' ? value : '')

async function handleLogin(values: FormValues) {
  try {
    await authStore.loginUser({
      email: stringValue(values.email),
      password: stringValue(values.password),
    })
    router.push('/')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'Erro ao realizar login'))
  }
}
async function handleRegister(values: FormValues) {
  try {
    await authStore.signupUser({
      name: stringValue(values.name),
      email: stringValue(values.email),
      password: stringValue(values.password),
    })
    toast.success('Cadastro realizado com sucesso!', { autoClose: 2000 })
    router.push('/')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'Erro ao realizar cadastro'))
  }
}
</script>

<template>
  <p
    v-if="route.query.reason === 'session-expired'"
    role="alert"
    class="mx-auto my-4 max-w-xl rounded-xl bg-amber-50 p-4 text-center text-amber-900"
  >
    Sua sessão expirou. Entre novamente para continuar.
  </p>
  <div
    v-if="isDesktop"
    class="fixed -z-10 h-screen inset-0 w-screen bg-contain bg-center bg-no-repeat transition-transform duration-1000 hidden lg:block"
    :class="{
      'translate-x-[40%]': waveDirection === 'right',
      'translate-x-[-40%]': waveDirection === 'left',
    }"
    style="background-image: url('/layouts/wavesAuth.svg')"
  ></div>

  <Transition
    mode="out-in"
    enter-active-class="transition duration-500 ease-out"
    leave-active-class="transition duration-500 ease-in"
    enter-from-class="opacity-0 translate-x-10"
    enter-to-class="opacity-100 translate-x-0"
    leave-from-class="opacity-100 translate-x-0"
    leave-to-class="opacity-0 -translate-x-10"
    :class="[!isDesktop ? 'flex flex-col items-center justify-center' : '']"
  >
    <AuthLogin
      v-if="isLogin"
      :login-fields="loginFields"
      @submit="handleLogin"
      @toggle="toggleWave"
    />

    <AuthRegister
      v-else
      :register-fields="registerFields"
      @submit="handleRegister"
      @toggle="toggleWave"
    />
  </Transition>
</template>
