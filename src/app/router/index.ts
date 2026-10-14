import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        { path: '/', name: 'Início', component: () => import('../../views/HomeView.vue') },
        {
          path: '/cameras',
          name: 'Câmeras',
          component: () => import('../../views/Camera/HomeView.vue'),
        },
        {
          path: '/cameras/:id',
          name: 'Câmera',
          component: () => import('../../views/Camera/InfoCameraView.vue'),
          props: true,
        },
        {
          path: '/demo',
          name: 'Demo',
          component: () => import('@/modules/flood-demo/DemoView.vue'),
        },
        {
          path: '/blog',
          name: 'Blog',
          component: () => import('@/modules/blog').then(({ BlogHomeView }) => BlogHomeView),
        },
        {
          path: '/blog/:id',
          name: 'blog-post',
          component: () => import('@/modules/blog').then(({ BlogNewsView }) => BlogNewsView),
          props: true,
        },
        {
          path: '/suporte',
          name: 'Suporte',
          component: () =>
            import('@/modules/support').then(({ SupportHomeView }) => SupportHomeView),
        },
        {
          path: '/chat/:id',
          name: 'Chat',
          component: () =>
            import('@/modules/support').then(({ SupportChatView }) => SupportChatView),
          props: true,
        },
      ],
    },
    {
      path: '/',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '/admin',
          name: 'Administração',
          component: () => import('../../views/Admin/HomeView.vue'),
        },
        {
          path: '/admin/registrar-ponto',
          name: 'Registrar ponto',
          component: () => import('../../views/Admin/RegisterPointView.vue'),
        },
        {
          path: '/admin/cameras/cadastro',
          name: 'Cadastrar câmera',
          component: () => import('../../views/Admin/CameraCreateView.vue'),
        },
        {
          path: '/admin/cameras',
          name: 'Gerenciar câmeras',
          component: () => import('../../views/Admin/CameraManagementView.vue'),
        },
        {
          path: '/admin/cameras/:id/localizacao',
          name: 'Alterar localização da câmera',
          component: () => import('../../views/Admin/CameraLocationEditView.vue'),
          props: true,
        },
        {
          path: '/admin/inteligencia',
          name: 'Inteligência do monitoramento',
          component: () => import('@/modules/intelligence/MonitoringIntelligenceView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: '/admin/alertas',
          name: 'Alertas operacionais',
          component: () =>
            import('@/modules/notifications/NotificationCenterView.vue'),
        },
      ],
    },
    {
      path: '/',
      component: () => import('../layouts/ProfileLayout.vue'),
      children: [
        {
          path: '/seguranca',
          name: 'Segurança',
          component: () =>
            import('@/modules/profile').then(({ ProfileSecurityView }) => ProfileSecurityView),
          meta: { requiresAuth: true },
        },
        {
          path: '/notificacoes',
          name: 'Notificações',
          component: () =>
            import('@/modules/notifications/NotificationPreferencesView.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: '/',
      component: () => import('../layouts/PaymentLayout.vue'),
      children: [
        {
          path: '/doacao',
          name: 'Pagamento',
          component: () => import('@/modules/payments').then(({ PaymentView }) => PaymentView),
        },
      ],
    },
    {
      path: '/',
      component: () => import('../layouts/AuthLayout.vue'),
      children: [
        {
          path: '/auth',
          name: 'auth',
          component: () => import('@/modules/auth/views/AuthView.vue'),
          beforeEnter: (to, from, next) => {
            const mode = to.query.mode
            if (mode !== 'login' && mode !== 'register') return next({ name: 'NotFound' })
            to.meta.title = mode === 'login' ? 'Entrar' : 'Cadastro'
            next()
          },
        },
        {
          path: '/recuperacao',
          name: 'Recuperação',
          component: () => import('@/modules/auth/views/RecoveryView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../../views/NotFoundView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const { useAuthStore } = await import('@/modules/auth/stores/auth')
  const authStore = useAuthStore()
  const loginRedirect = {
    name: 'auth',
    query: { mode: 'login', redirect: to.fullPath },
  }

  if (!authStore.isAuthenticated || !authStore.token?.access) return loginRedirect

  if (!authStore.user) {
    try {
      await authStore.getMe()
    } catch {
      return loginRedirect
    }
  }

  if (to.meta.requiresAdmin && authStore.user?.type !== 'admin') return { name: 'Início' }
  return true
})

export default router
