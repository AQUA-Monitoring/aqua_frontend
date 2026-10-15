import axios from 'axios'

export interface ApiErrorInfo {
  status?: number
  code: string
  detail?: string
  message: string
  retryable: boolean
  requestId?: string
}

const DEFAULT_MESSAGE = 'Não foi possível concluir a operação. Tente novamente em instantes.'

export function parseApiError(error: unknown, fallbackMessage = DEFAULT_MESSAGE): ApiErrorInfo {
  const result = (code: string, message: string, retryable = false): ApiErrorInfo => ({
    code, message, retryable,
  })
  if (axios.isCancel(error)) return result('REQUEST_CANCELLED', 'A operação foi cancelada.')
  if (!axios.isAxiosError(error)) return result('UNEXPECTED_ERROR', fallbackMessage, true)

  const status = error.response?.status
  const data: unknown = error.response?.data
  const body = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  const requestId = typeof body.request_id === 'string' && /^[a-f0-9-]{36}$/.test(body.request_id)
    ? body.request_id : undefined
  let info: ApiErrorInfo
  if (!error.response) {
    info = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? result('REQUEST_TIMEOUT', 'O serviço demorou para responder. Aguarde um momento e tente novamente.', true)
      : result('NETWORK_ERROR', 'Não foi possível conectar ao serviço. Confira sua conexão e tente novamente.', true)
  } else if (status === 401) {
    info = result('AUTHENTICATION_REQUIRED', error.config?.url?.includes('/auth/token/')
      ? 'Não foi possível entrar. Confira seu email e sua senha.'
      : 'Sua sessão expirou. Entre novamente para continuar.')
  } else if (status === 403) {
    info = result('PERMISSION_DENIED', 'Sua conta não tem permissão para esta ação. Solicite acesso à administração.')
  } else if (status === 404) {
    info = result('RESOURCE_NOT_FOUND', 'O item solicitado não foi encontrado. Atualize a página e tente novamente.')
  } else if (status === 409) {
    info = result('RESOURCE_CONFLICT', 'Os dados foram alterados ou já existem. Atualize a página antes de tentar novamente.')
  } else if (status === 429) {
    info = result('RATE_LIMITED', 'Há muitas solicitações neste momento. Aguarde um pouco antes de tentar novamente.', true)
  } else if (status && status >= 500) {
    info = result('SERVICE_UNAVAILABLE', 'O serviço está temporariamente indisponível. Os dados podem estar desatualizados. Tente novamente em alguns instantes.', true)
  } else if (status === 400 || status === 422) {
    info = result('VALIDATION_ERROR', 'Não foi possível salvar. Confira os campos informados e tente novamente.')
  } else {
    info = result('REQUEST_FAILED', fallbackMessage, true)
  }
  return { ...info, status, requestId }
}
