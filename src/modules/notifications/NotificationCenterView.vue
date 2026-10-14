<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue3-toastify'
import OperationalAlertsView from './OperationalAlertsView.vue'
import NotificationComposer from './components/NotificationComposer.vue'
import { notificationsApi } from './api'
import type { NotificationEvent } from './types'

type Tab = 'review' | 'published' | 'new' | 'deliveries'
const tab = ref<Tab>('review')
const composerOpened = ref(false)
watch(tab, (value) => {
  if (value === 'new') composerOpened.value = true
})
const events = ref<NotificationEvent[]>([])
const visibleEvents = computed(() =>
  events.value.filter((item) => (tab.value === 'published' ? item.status === 'PUBLISHED' : true)),
)
async function loadEvents() {
  try {
    events.value = await notificationsApi.listEvents()
  } catch {
    toast.error('Não foi possível carregar os comunicados.')
  }
}
async function onPublished() {
  tab.value = 'published'
  await loadEvents()
}
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
onMounted(loadEvents)
</script>

<template>
  <section
    class="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-0"
    aria-labelledby="notification-center-title"
  >
    <header class="mb-5 rounded-3xl bg-gradient-to-br from-[#00182F] to-[#0750AF] p-6 text-white">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Administração</p>
      <h1 id="notification-center-title" class="mt-2 text-3xl font-semibold">
        Central de notificações
      </h1>
      <p class="mt-2 text-blue-100">
        Revise detecções, publique comunicados e acompanhe as entregas em um só lugar.
      </p>
    </header>
    <nav class="mb-5 flex flex-wrap gap-2" aria-label="Seções da central">
      <button
        v-for="item in [
          ['review', 'Para revisar'],
          ['published', 'Publicados'],
          ['new', 'Novo comunicado'],
          ['deliveries', 'Entregas'],
        ] as const"
        :key="item[0]"
        type="button"
        :class="[
          'min-h-11 rounded-xl px-4 py-2 font-semibold',
          tab === item[0] ? 'bg-[#2768CA] text-white' : 'border border-slate-300',
        ]"
        @click="tab = item[0]"
      >
        {{ item[1] }}
      </button>
    </nav>
    <OperationalAlertsView v-if="tab === 'review'" />
    <NotificationComposer v-if="composerOpened" v-show="tab === 'new'" @published="onPublished" />
    <div v-if="tab === 'published' || tab === 'deliveries'" class="grid gap-3">
      <p
        v-if="!visibleEvents.length"
        class="rounded-2xl border border-dashed p-8 text-center text-slate-500"
      >
        Nenhuma notificação encontrada.
      </p>
      <article
        v-for="event in visibleEvents"
        :key="event.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#001C3B]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span class="text-xs font-semibold text-[#2768CA]"
              >{{ event.origin }} · {{ event.severity }} ·
              {{ event.is_global ? 'Global' : 'Por região/bairro' }}</span
            >
            <h2 class="mt-1 text-lg font-semibold">{{ event.title }}</h2>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ event.message }}</p>
          </div>
          <span
            class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-white/10"
            >{{ event.status }}</span
          >
        </div>
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
          <span>{{ formatDate(event.published_at || event.created_at) }}</span
          ><span>{{ event.audience_count }} destinatários</span
          ><span>Enviadas: {{ event.delivery_summary.sent }}</span
          ><span>Pendentes: {{ event.delivery_summary.pending }}</span
          ><span>Falhas: {{ event.delivery_summary.failed }}</span
          ><span>Expiradas: {{ event.delivery_summary.expired }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
