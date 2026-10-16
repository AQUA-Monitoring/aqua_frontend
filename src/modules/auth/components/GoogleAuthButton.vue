<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthApi from '../services/Auth'
import { loadGoogleIdentity } from '../services/googleIdentity'
import { useAuthStore } from '../stores/auth'

const props = withDefaults(defineProps<{ mode?: 'login' | 'register' }>(), { mode: 'login' })
const router = useRouter()
const auth = useAuthStore()
const api = new AuthApi()
const button = ref<HTMLDivElement | null>(null)
const enabled = ref(false)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
let disposed = false

async function initialize() {
  loading.value = true
  try {
    const config = await api.getGoogleConfig()
    if (disposed) return
    enabled.value = config.enabled
    if (!config.enabled) return
    const identity = await loadGoogleIdentity()
    if (disposed || !button.value) return
    identity.initialize({
      client_id: config.client_id,
      nonce: config.nonce,
      auto_select: false,
      callback: async ({ credential }) => {
        if (disposed || busy.value || !credential) return
        busy.value = true
        error.value = ''
        try {
          await auth.loginWithGoogle({ credential, challenge: config.challenge })
          if (!disposed) await router.push('/')
        } catch (cause) {
          if (!disposed) {
            error.value = cause instanceof Error ? cause.message : 'Não foi possível entrar com Google. Tente novamente.'
            // A server challenge is single-use: each retry gets a fresh nonce.
            await initialize()
          }
        } finally {
          busy.value = false
        }
      },
    })
    button.value.replaceChildren()
    identity.renderButton(button.value, {
      type: 'standard', theme: 'outline', size: 'large',
      text: props.mode === 'register' ? 'signup_with' : 'signin_with',
      width: Math.min(400, Math.max(200, button.value.clientWidth)), locale: 'pt-BR',
    })
  } catch {
    if (!disposed) error.value = 'O acesso com Google está indisponível no momento. Use email e senha ou tente novamente.'
  } finally {
    if (!disposed) loading.value = false
  }
}

function retry() {
  error.value = ''
  void initialize()
}
onMounted(initialize)
onBeforeUnmount(() => { disposed = true })
</script>

<template>
  <section v-show="enabled || loading || error" class="mx-auto mt-5 w-full max-w-100" aria-label="Acesso com Google" :aria-busy="busy">
    <p v-if="enabled" class="mb-4 text-center text-sm text-slate-500 dark:text-slate-300">ou</p>
    <p v-if="loading" class="text-center text-sm" role="status">Carregando acesso com Google…</p>
    <div ref="button" :class="{ 'pointer-events-none opacity-60': busy || loading }" />
    <p v-if="busy" class="mt-2 text-center text-sm" role="status">Confirmando sua conta…</p>
    <div v-if="error" class="mt-3 text-center text-sm">
      <p role="alert">{{ error }}</p>
      <button type="button" class="mt-2 cursor-pointer underline" :disabled="loading || busy" @click="retry">Tentar novamente</button>
    </div>
  </section>
</template>
