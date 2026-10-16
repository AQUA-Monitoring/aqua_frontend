<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AuthApi from '../services/Auth'
import { loadGoogleIdentity, type GoogleIdentity } from '../services/googleIdentity'
import { useTheme } from '@/shared/composables/useTheme'
import { useAuthStore } from '../stores/auth'

const props = withDefaults(defineProps<{ mode?: 'login' | 'register' }>(), { mode: 'login' })
const router = useRouter()
const { isDark } = useTheme()
const auth = useAuthStore()
const api = new AuthApi()
const button = ref<HTMLDivElement | null>(null)
const enabled = ref(false)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
let disposed = false
let identity: GoogleIdentity | null = null
let resize: ResizeObserver | null = null
let renderedWidth = -1
let renderedTheme = ''

function renderButton() {
  if (disposed || !identity || !button.value) return
  const width = Math.min(400, Math.max(200, Math.floor(button.value.clientWidth)))
  const theme = isDark.value ? 'filled_black' : 'outline'
  if (renderedWidth === width && renderedTheme === theme) return
  renderedWidth = width
  renderedTheme = theme
  button.value.replaceChildren()
  identity.renderButton(button.value, {
    type: 'standard', theme, shape: 'pill', logo_alignment: 'left', size: 'large',
    text: props.mode === 'register' ? 'signup_with' : 'signin_with', width, locale: 'pt-BR',
  })
}

async function initialize() {
  loading.value = true
  try {
    const config = await api.getGoogleConfig()
    if (disposed) return
    enabled.value = config.enabled
    if (!config.enabled) return
    identity = await loadGoogleIdentity()
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
    renderedWidth = -1
    await nextTick()
    renderButton()
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
watch(isDark, renderButton)
onMounted(() => {
  resize = new ResizeObserver(renderButton)
  if (button.value) resize.observe(button.value)
  void initialize()
})
onBeforeUnmount(() => {
  disposed = true
  resize?.disconnect()
})
</script>

<template>
  <section v-show="enabled || loading || error" class="mx-auto mt-6 w-full max-w-100" aria-label="Acesso com Google" :aria-busy="busy">
    <div v-if="enabled" class="mb-5 flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      <span class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">ou</span>
      <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
    </div>
    <p v-if="loading" class="text-center text-sm" role="status">Carregando acesso com Google…</p>
    <div
      ref="button"
      class="google-button min-h-10 w-full rounded-full shadow-[0_3px_12px_-4px_rgba(15,23,42,0.2)] transition-[box-shadow,transform,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-5px_rgba(15,23,42,0.25)] focus-within:ring-4 focus-within:ring-blue-500/20 dark:shadow-[0_3px_16px_-5px_rgba(0,0,0,0.45)] motion-reduce:transform-none motion-reduce:transition-none"
      :class="{ 'pointer-events-none opacity-60': busy || loading }"
    />
    <p v-if="busy" class="mt-2 text-center text-sm" role="status">Confirmando sua conta…</p>
    <div v-if="error" class="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
      <p role="alert">{{ error }}</p>
      <button type="button" class="mt-2 min-h-9 cursor-pointer rounded-full px-3 font-semibold underline decoration-red-300 underline-offset-4 disabled:cursor-wait disabled:opacity-50" :disabled="loading || busy" @click="retry">Tentar novamente</button>
    </div>
  </section>
</template>

<style scoped>
/* Match the Google document's color scheme so its transparent canvas stays clear. */
.google-button :deep(iframe) {
  color-scheme: normal;
}
</style>
