import { computed, inject, ref, watch, type App, type InjectionKey } from 'vue'
import { legacyEnglish } from './legacyUi'

export type AppLocale = 'pt-BR' | 'en'

const locale = ref<AppLocale>('pt-BR')
const translatedValues = new Set(Object.values(legacyEnglish))
const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()
const translatedAttributes = ['aria-label', 'aria-description', 'placeholder', 'title', 'alt']

export function formatLocale() { return locale.value === 'en' ? 'en-US' : 'pt-BR' }

function translateLegacyPhrase(value: string) {
  const exact = legacyEnglish[value]
  if (exact) return exact
  const separator = value.indexOf(': ')
  if (separator > 0) {
    const label = legacyEnglish[value.slice(0, separator + 1)] ?? legacyEnglish[value.slice(0, separator)]
    if (label) return `${label.replace(/:$/, '')}: ${value.slice(separator + 2)}`
  }
  const patterns: Array<[RegExp, (...matches: string[]) => string]> = [
    [/^(\d+) câmeras? encontradas?$/, (count) => `${count} ${count === '1' ? 'camera found' : 'cameras found'}`],
    [/^(\d+) câmeras? com localização$/, (count) => `${count} ${count === '1' ? 'camera with a location' : 'cameras with locations'}`],
    [/^(\d+) destinatários$/, (count) => `${count} recipients`],
    [/^(\d+) opções$/, (count) => `${count} options`],
    [/^(\d+) regiões selecionadas$/, (count) => `${count} selected regions`],
    [/^Página (\d+)$/, (page) => `Page ${page}`],
    [/^Remover região (.+)$/, (name) => `Remove region ${name}`],
    [/^Remover bairro (.+)$/, (name) => `Remove neighborhood ${name}`],
    [/^Página (\d+) · (.+) resultado\(s\)$/, (page, count) => `Page ${page} · ${count} result(s)`],
    [/^Página (\d+) · (\d+) sequências$/, (page, count) => `Page ${page} · ${count} sequences`],
    [/^©\s*(\d+)\s*- Todos os direitos reservados\s*-?$/, (year) => `© ${year} - All rights reserved`],
    [/^(\d+) indícios abertos$/, (count) => `${count} open indications`],
    [/^Evidência de (.+)$/, (name) => `Evidence from ${name}`],
    [/^Evidência ampliada de (.+)$/, (name) => `Enlarged evidence from ${name}`],
    [/^Inclui as (\d+) regiões disponíveis\. Você pode desmarcar depois\.$/, (count) => `Includes all ${count} available regions. You can unfollow them later.`],
    [/^Aprox\. (.+) s antes$/, (seconds) => `Approx. ${seconds} s earlier`],
    [/^A transmissão está cerca de (\d+) segundos atrasada\.$/, (seconds) => `The stream is about ${seconds} seconds behind.`],
    [/^Expira em (\d+) segundos$/, (seconds) => `Expires in ${seconds} seconds`],
  ]
  for (const [pattern, replacement] of patterns) {
    const match = value.match(pattern)
    if (match) return replacement(...match.slice(1))
  }
}
const messages = {
  'pt-BR': {
    language: { label: 'Idioma', portuguese: 'Português', english: 'English' },
    nav: {
      home: 'Início', cameras: 'Câmeras', more: 'Mais', demo: 'Transmissão demo', blog: 'Blog',
      donate: 'Doar', support: 'Suporte', signIn: 'Entrar', signUp: 'Criar conta', profile: 'Perfil',
      admin: 'Administração', security: 'Segurança', notifications: 'Notificações', about: 'Sobre nós',
      map: 'Mapa', account: 'Minha conta', menu: 'Menu',
    },
    route: {
      home: 'Início', cameras: 'Câmeras', camera: 'Câmera', demo: 'Demo', blog: 'Blog',
      support: 'Suporte', chat: 'Chat', admin: 'Administração', registerPoint: 'Registrar ponto',
      createCamera: 'Cadastrar câmera', manageCameras: 'Gerenciar câmeras',
      cameraLocation: 'Alterar localização da câmera', intelligence: 'Inteligência do monitoramento',
      alerts: 'Alertas operacionais', security: 'Segurança', notifications: 'Notificações',
      payment: 'Pagamento', recovery: 'Recuperação', signIn: 'Entrar', signUp: 'Cadastro',
      about: 'Sobre o Aqua', notFound: 'Página não encontrada',
    },
    about: {
      eyebrow: 'Monitoramento para comunidades mais preparadas',
      title: 'Conheça o Aqua',
      intro: 'O Aqua reúne dados de chuva, pontos de alagamento e câmeras em uma experiência acessível para acompanhar as condições da cidade.',
      explore: 'Abrir mapa ao vivo', cameras: 'Ver câmeras', demo: 'Conhecer a demonstração',
      purposeTitle: 'Informação útil quando ela mais importa',
      purpose: 'O projeto transforma diferentes sinais do território em contexto para moradores, equipes operacionais e parceiros públicos tomarem decisões mais bem informadas.',
      capabilitiesTitle: 'O que você encontra no Aqua',
      mapTitle: 'Mapa contextual', mapText: 'Visualize pontos ativos, áreas afetadas e a situação das regiões monitoradas.',
      cameraTitle: 'Câmeras ao vivo', cameraText: 'Consulte imagens e o histórico recente das câmeras disponíveis.',
      alertTitle: 'Alertas e acompanhamento', alertText: 'Acompanhe mudanças relevantes e escolha os territórios sobre os quais deseja receber avisos.',
      projectTitle: 'Sobre o projeto',
      project: 'Aqua é uma aplicação web de análise pluviométrica e monitoramento de alagamentos. A plataforma combina mapas, câmeras, previsões e comunicação para tornar dados locais mais fáceis de compreender e usar.',
      partner: 'O projeto apresenta informações e referências da Defesa Civil de Santa Catarina e mantém canais públicos para contato e acompanhamento.',
      contact: 'Contato', follow: 'Acompanhe o Aqua',
    },
  },
  en: {
    language: { label: 'Language', portuguese: 'Português', english: 'English' },
    nav: {
      home: 'Home', cameras: 'Cameras', more: 'More', demo: 'Live demo', blog: 'Blog',
      donate: 'Donate', support: 'Support', signIn: 'Sign in', signUp: 'Create account', profile: 'Profile',
      admin: 'Administration', security: 'Security', notifications: 'Notifications', about: 'About us',
      map: 'Map', account: 'My account', menu: 'Menu',
    },
    route: {
      home: 'Home', cameras: 'Cameras', camera: 'Camera', demo: 'Demo', blog: 'Blog',
      support: 'Support', chat: 'Chat', admin: 'Administration', registerPoint: 'Register flood point',
      createCamera: 'Add camera', manageCameras: 'Manage cameras', cameraLocation: 'Change camera location',
      intelligence: 'Monitoring intelligence', alerts: 'Operational alerts', security: 'Security',
      notifications: 'Notifications', payment: 'Payment', recovery: 'Account recovery',
      signIn: 'Sign in', signUp: 'Create account', about: 'About Aqua', notFound: 'Page not found',
    },
    about: {
      eyebrow: 'Monitoring for better-prepared communities',
      title: 'Meet Aqua',
      intro: 'Aqua brings rainfall data, flood points, and cameras together in an accessible experience for tracking conditions across the city.',
      explore: 'Open live map', cameras: 'View cameras', demo: 'Explore the demo',
      purposeTitle: 'Useful information when it matters most',
      purpose: 'The project turns different signals from the territory into context that helps residents, operations teams, and public partners make better-informed decisions.',
      capabilitiesTitle: 'What you can find in Aqua',
      mapTitle: 'Contextual map', mapText: 'View active points, affected areas, and conditions across monitored regions.',
      cameraTitle: 'Live cameras', cameraText: 'Access live images and recent history from available cameras.',
      alertTitle: 'Alerts and updates', alertText: 'Follow relevant changes and choose the areas for which you want to receive notifications.',
      projectTitle: 'About the project',
      project: 'Aqua is a web application for rainfall analysis and flood monitoring. It combines maps, cameras, forecasts, and communication to make local data easier to understand and use.',
      partner: 'The project presents information and references from the Santa Catarina Civil Defense and maintains public channels for contact and updates.',
      contact: 'Contact', follow: 'Follow Aqua',
    },
  },
} as const

interface MessageTree { [key: string]: string | MessageTree }

export function translate(key: string, values: Record<string, string | number> = {}) {
  const read = (targetLocale: AppLocale) => key.split('.').reduce<string | MessageTree | undefined>(
    (node, part) => typeof node === 'object' ? node[part] : undefined,
    messages[targetLocale] as MessageTree,
  )
  const value = read(locale.value) ?? read('pt-BR') ?? key
  if (typeof value !== 'string') return key
  return Object.entries(values).reduce((text, [name, replacement]) =>
    text.replaceAll(`{${name}}`, String(replacement)), value)
}

export function localize(portuguese: string, english: string) {
  return locale.value === 'en' ? english : portuguese
}

function translateLegacyNode(node: Node) {
  if (node instanceof Text) {
    const normalized = node.data.trim().replaceAll(/\s+/g, ' ')
    if (locale.value === 'pt-BR') {
      const original = originalText.get(node)
      if (original !== undefined && node.data !== original) node.data = original
      return
    }
    const translated = translateLegacyPhrase(normalized)
    if (!translated || translatedValues.has(normalized)) return
    originalText.set(node, node.data)
    const leading = node.data.match(/^\s*/)?.[0] ?? ''
    const trailing = node.data.match(/\s*$/)?.[0] ?? ''
    node.data = `${leading}${translated}${trailing}`
    return
  }
  if (!(node instanceof Element)) return
  if (node.matches('script, style, textarea, [translate="no"]')) return
  for (const attribute of translatedAttributes) {
    const value = node.getAttribute(attribute)
    if (!value) continue
    if (locale.value === 'pt-BR') {
      const original = originalAttributes.get(node)?.get(attribute)
      if (original !== undefined && value !== original) node.setAttribute(attribute, original)
      continue
    }
    const translated = translateLegacyPhrase(value.trim().replaceAll(/\s+/g, ' '))
    if (!translated || translatedValues.has(value)) continue
    const originals = originalAttributes.get(node) ?? new Map<string, string>()
    originals.set(attribute, value)
    originalAttributes.set(node, originals)
    node.setAttribute(attribute, translated)
  }
  for (const child of node.childNodes) translateLegacyNode(child)
}

function installLegacyTranslator() {
  const translateDocument = () => translateLegacyNode(document.documentElement)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateLegacyNode(mutation.target)
      else if (mutation.type === 'attributes') translateLegacyNode(mutation.target)
      else for (const node of mutation.addedNodes) translateLegacyNode(node)
    }
  })
  observer.observe(document.documentElement, { childList: true, characterData: true, attributes: true, attributeFilter: translatedAttributes, subtree: true })
  watch(locale, () => queueMicrotask(translateDocument), { immediate: true })
}

export function setLocale(value: AppLocale) {
  locale.value = value
  document.documentElement.lang = value
}

export function localeFromPath(path: string): AppLocale {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'pt-BR'
}

export function localePath(path: string, targetLocale = locale.value) {
  const normalized = path.startsWith('/en/') ? path.slice(3) : path === '/en' ? '/' : path
  if (targetLocale === 'pt-BR') {
    if (normalized === '/about') return '/sobre'
    if (normalized === '/map') return '/'
    return normalized
  }
  if (normalized === '/sobre') return '/en/about'
  if (normalized === '/') return '/en/map'
  return `/en${normalized}`
}

export function switchLocalePath(path: string, targetLocale: AppLocale) {
  if (path === '/en') return targetLocale === 'en' ? '/en' : '/sobre'
  return localePath(path, targetLocale)
}

const i18nKey: InjectionKey<{ locale: typeof locale; t: typeof translate }> = Symbol('aqua-i18n')

export const i18n = {
  install(app: App) {
    app.provide(i18nKey, { locale, t: translate })
    app.config.globalProperties.$t = translate
    app.config.globalProperties.$localePath = localePath
    app.config.globalProperties.$l = localize
    installLegacyTranslator()
  },
}

export function useI18n() {
  const context = inject(i18nKey)
  if (!context) throw new Error('Aqua i18n is not installed')
  return { ...context, isEnglish: computed(() => context.locale.value === 'en'), localePath }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: typeof translate
    $localePath: typeof localePath
    $l: typeof localize
  }
}
