import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/app/router'
import { toast, type ToastOptions } from 'vue3-toastify'
import AuthApi from '../services/Auth'
import { useLoadingStore } from '@/stores/loading'
import type { IToken, IUser, LoginRequest, SignupRequest, UpdateMeRequest } from '../types/auth'
import { parseApiError } from '@/shared'

const authServiceClient = new AuthApi()

export const useAuthStore = defineStore('auth', () => {
  const loadingStore = useLoadingStore()
  const user = ref<IUser | null>(null)
  const token = ref<IToken | null>({
    access: localStorage.getItem('access_token') ?? '',
    refresh: localStorage.getItem('refresh_token') ?? '',
  })
  const isAuthenticated = ref(!!localStorage.getItem('access_token'))

  function persistTokens(tokens: IToken) {
    token.value = tokens
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
  }

  function clearTokens() {
    token.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async function loginUser(authData: LoginRequest) {
    loadingStore.start()
    try {
      const response = await authServiceClient.loginUser(authData)

      toast.success('Sessão iniciada com sucesso!', {
        autoClose: 5000,
        position: toast.POSITION.TOP_RIGHT,
        icon: true,
      } as ToastOptions)

      isAuthenticated.value = true
      persistTokens(response)
      await getMe()
    } catch (error: unknown) {
      const parsed = parseApiError(error, 'Nao foi possivel iniciar a sessao.')
      console.error('Erro detalhado:', parsed)
      throw parsed
    } finally {
      loadingStore.stop()
    }
  }

  async function signupUser(payload: SignupRequest) {
    loadingStore.start()
    try {
      const response = await authServiceClient.signupUser(payload)
      persistTokens(response.tokens)
      user.value = response.user
      isAuthenticated.value = true
    } catch (error: unknown) {
      const parsed = parseApiError(error, 'Nao foi possivel concluir o cadastro.')
      console.error('Erro detalhado:', parsed)
      throw parsed
    } finally {
      loadingStore.stop()
    }
  }

  async function getMe() {
    try {
      const response = await authServiceClient.getMe()
      user.value = response
      isAuthenticated.value = true
    } catch (error: unknown) {
      const parsed = parseApiError(error, 'Nao foi possivel carregar os dados do usuario.')
      console.error('Erro ao buscar usuario:', parsed)
      if (parsed.status === 401 || parsed.status === 403 || parsed.status === 404) {
        logout({ silent: true })
      }
      throw parsed
    }
  }

  async function updateMe(payload: UpdateMeRequest) {
    loadingStore.start()
    try {
      const response = await authServiceClient.updateMe(payload)
      user.value = response
    } catch (error: unknown) {
      const parsed = parseApiError(error, 'Nao foi possivel atualizar os dados do usuario.')
      console.error('Erro ao atualizar usuario:', parsed)
      throw parsed
    } finally {
      loadingStore.stop()
    }
  }

  async function refreshToken() {
    const refresh = token.value?.refresh ?? localStorage.getItem('refresh_token')

    if (refresh) {
      try {
        const response = await authServiceClient.refreshToken({ refresh })
        token.value = {
          access: response.access,
          refresh,
        }
        localStorage.setItem('access_token', response.access)
      } catch (error) {
        const parsed = parseApiError(error)
        if (parsed.status === 401 || parsed.status === 403) {
          await logout({ silent: true, reason: 'session-expired' })
        }
        throw error
      }
    } else {
      await logout({ silent: true, reason: 'session-expired' })
      throw parseApiError(null, 'Sessao expirada. Faca login novamente.')
    }
  }

  async function logout({ silent = false, reason }: { silent?: boolean; reason?: 'session-expired' } = {}) {
    clearTokens()
    isAuthenticated.value = false
    user.value = null

    if (!silent) {
      toast.success('Sessão encerrada com sucesso!', {
        autoClose: 5000,
        position: toast.POSITION.TOP_RIGHT,
        icon: true,
      } as ToastOptions)
    }

    await router.push({ name: 'auth', query: { mode: 'login', ...(reason ? { reason } : {}) } })
  }

  return {
    user,
    token,
    isAuthenticated,
    loginUser,
    signupUser,
    getMe,
    updateMe,
    refreshToken,
    logout,
  }
})
