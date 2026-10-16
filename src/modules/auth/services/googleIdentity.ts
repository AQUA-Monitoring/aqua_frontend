export interface GoogleCredential {
  credential: string
}

export interface GoogleIdentity {
  initialize(config: {
    client_id: string
    nonce: string
    callback: (response: GoogleCredential) => void
    auto_select: boolean
  }): void
  renderButton(element: HTMLElement, config: {
    type: 'standard'
    theme: 'outline'
    size: 'large'
    text: 'signin_with' | 'signup_with'
    width: number
    locale: string
  }): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

let loading: Promise<GoogleIdentity> | null = null

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (loading) return loading
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR'
    script.async = true
    const timeout = window.setTimeout(fail, 15_000)
    function fail() {
      window.clearTimeout(timeout)
      script.remove()
      loading = null
      reject(new Error('Não foi possível carregar o Google. Tente novamente.'))
    }
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timeout)
      const identity = window.google?.accounts.id
      if (identity) resolve(identity)
      else fail()
    }
    document.head.appendChild(script)
  })
  return loading
}
