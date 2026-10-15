import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/api/',
  timeout: 20_000,
})

let refreshPromise: Promise<void> | null = null

function getAccessToken() {
  return localStorage.getItem('access_token')
}

function setAuthorization(request: InternalAxiosRequestConfig, token: string | null) {
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  else request.headers.delete('Authorization')
}

function isTokenEndpoint(url = '') {
  return url.includes('/auth/token/')
}

api.interceptors.request.use(
  (request) => {
    setAuthorization(request, getAccessToken())
    return request
  },
  (error: unknown) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isTokenEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!refreshPromise) {
      const { useAuthStore } = await import('@/modules/auth/stores/auth')
      const authStore = useAuthStore()
      refreshPromise = authStore.refreshToken().finally(() => {
        refreshPromise = null
      })
    }

    await refreshPromise
    setAuthorization(originalRequest, getAccessToken())
    return api(originalRequest)
  },
)

export default api
