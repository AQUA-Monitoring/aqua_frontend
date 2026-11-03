import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { localeFromPath, localePath, setLocale, translate } from '@/app/i18n'

const named = (name: string, english: boolean) => `${name}${english ? '-en' : ''}`
function applicationRoutes(english = false): RouteRecordRaw[] {
  const root = english ? '/en' : '/'
  return [
    {
      path: root,
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        { path: english ? 'map' : '', name: named('home', english), meta: { titleKey: 'route.home' }, component: () => import('../../views/HomeView.vue') },
        { path: 'cameras', name: named('cameras', english), meta: { titleKey: 'route.cameras' }, component: () => import('../../views/Camera/HomeView.vue') },
        { path: 'cameras/:id', name: named('camera', english), meta: { titleKey: 'route.camera' }, component: () => import('../../views/Camera/InfoCameraView.vue'), props: true },
        { path: 'demo', name: named('demo', english), meta: { titleKey: 'route.demo' }, component: () => import('@/modules/flood-demo/DemoView.vue') },
        { path: 'blog', name: named('blog', english), meta: { titleKey: 'route.blog' }, component: () => import('@/modules/blog').then(({ BlogHomeView }) => BlogHomeView) },
        { path: 'blog/:id', name: named('blog-post', english), meta: { titleKey: 'route.blog' }, component: () => import('@/modules/blog').then(({ BlogNewsView }) => BlogNewsView), props: true },
        { path: 'suporte', name: named('support', english), meta: { titleKey: 'route.support' }, component: () => import('@/modules/support').then(({ SupportHomeView }) => SupportHomeView) },
        { path: 'chat/:id', name: named('chat', english), meta: { titleKey: 'route.chat' }, component: () => import('@/modules/support').then(({ SupportChatView }) => SupportChatView), props: true },
      ],
    },
    {
      path: root, component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: 'admin', name: named('admin', english), meta: { titleKey: 'route.admin' }, component: () => import('../../views/Admin/HomeView.vue') },
        { path: 'admin/registrar-ponto', name: named('register-point', english), meta: { titleKey: 'route.registerPoint' }, component: () => import('../../views/Admin/RegisterPointView.vue') },
        { path: 'admin/cameras/cadastro', name: named('create-camera', english), meta: { titleKey: 'route.createCamera' }, component: () => import('../../views/Admin/CameraCreateView.vue') },
        { path: 'admin/cameras', name: named('manage-cameras', english), meta: { titleKey: 'route.manageCameras' }, component: () => import('../../views/Admin/CameraManagementView.vue') },
        { path: 'admin/cameras/:id/localizacao', name: named('camera-location', english), meta: { titleKey: 'route.cameraLocation' }, component: () => import('../../views/Admin/CameraLocationEditView.vue'), props: true },
        { path: 'admin/inteligencia', name: named('intelligence', english), meta: { titleKey: 'route.intelligence' }, component: () => import('@/modules/intelligence/MonitoringIntelligenceView.vue') },
        { path: 'admin/alertas', name: named('alerts', english), meta: { titleKey: 'route.alerts' }, component: () => import('@/modules/notifications/NotificationCenterView.vue') },
      ],
    },
    {
      path: root, component: () => import('../layouts/ProfileLayout.vue'),
      children: [
        { path: 'seguranca', name: named('security', english), meta: { titleKey: 'route.security', requiresAuth: true }, component: () => import('@/modules/profile').then(({ ProfileSecurityView }) => ProfileSecurityView) },
        { path: 'notificacoes', name: named('notifications', english), meta: { titleKey: 'route.notifications', requiresAuth: true }, component: () => import('@/modules/notifications/NotificationPreferencesView.vue') },
      ],
    },
    {
      path: root, component: () => import('../layouts/PaymentLayout.vue'),
      children: [{ path: 'doacao', name: named('payment', english), meta: { titleKey: 'route.payment' }, component: () => import('@/modules/payments').then(({ PaymentView }) => PaymentView) }],
    },
    {
      path: root, component: () => import('../layouts/AuthLayout.vue'),
      children: [
        {
          path: 'auth', name: named('auth', english), component: () => import('@/modules/auth/views/AuthView.vue'),
          beforeEnter: (to) => {
            const mode = to.query.mode
            if (mode !== 'login' && mode !== 'register') return english ? '/en/404' : '/404'
            to.meta.titleKey = mode === 'login' ? 'route.signIn' : 'route.signUp'
          },
        },
        { path: 'recuperacao', name: named('recovery', english), meta: { titleKey: 'route.recovery' }, component: () => import('@/modules/auth/views/RecoveryView.vue') },
      ],
    },
  ]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/en', name: 'about-en', meta: { titleKey: 'route.about' }, component: () => import('../../views/AboutView.vue') },
    ...applicationRoutes(),
    ...applicationRoutes(true),
    { path: '/sobre', name: 'about', meta: { titleKey: 'route.about' }, component: () => import('../../views/AboutView.vue') },
    { path: '/en/about', redirect: '/en' },
    { path: '/:pathMatch(.*)*', name: 'not-found', meta: { titleKey: 'route.notFound' }, component: () => import('../../views/NotFoundView.vue') },
  ],
  scrollBehavior() { return { top: 0 } },
})

router.beforeEach(async (to) => {
  setLocale(localeFromPath(to.path))
  if (!to.meta.requiresAuth) return true

  const { useAuthStore } = await import('@/modules/auth/stores/auth')
  const authStore = useAuthStore()
  const loginRedirect = { path: localePath('/auth'), query: { mode: 'login', redirect: to.fullPath } }
  if (!authStore.isAuthenticated || !authStore.token?.access) return loginRedirect
  if (!authStore.user) {
    try { await authStore.getMe() } catch { return loginRedirect }
  }
  if (to.meta.requiresAdmin && authStore.user?.type !== 'admin') return localePath('/')
  return true
})

router.afterEach((to) => {
  const key = String(to.meta.titleKey ?? 'route.home')
  document.title = `${translate(key)} — Aqua`
})

export default router
