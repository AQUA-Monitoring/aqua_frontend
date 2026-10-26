<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/modules/auth'
import { useFloodPointsStore, FloodPointsApi } from '@/modules/flood-points'
import AdminPasswordDialog from '@/shared/components/AdminPasswordDialog.vue'
import { parseApiError } from '@/shared'
import { toast } from 'vue3-toastify'
import { useRoute } from 'vue-router'
import { formatDuration } from '@/modules/forecast'
import type { IFloodListItem } from '@/modules/flood-points'

const props = withDefaults(
  defineProps<{
    points: IFloodListItem[]
    externalScroll?: boolean
  }>(),
  { externalScroll: false },
)

const route = useRoute()
const auth = useAuthStore()
const store = useFloodPointsStore()
const api = new FloodPointsApi()
const canManage = computed(() => auth.user?.type === 'admin' || auth.user?.is_superuser === true)
const change = ref<{
  id: string | number
  name: string
  finishedAt?: string
} | null>(null)
const busy = ref(false)
const changeError = ref('')
function openChange(point: IFloodListItem, end: boolean) {
  const raw = store.itemsRaw.find((item) => String(item.id) === String(point.id))
  if (!raw) return
  const date = new Date(raw.finished_at)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  changeError.value = ''
  change.value = {
    id: point.id,
    name: point.neighborhood,
    finishedAt: end ? undefined : local,
  }
}
async function confirmChange(value: { password: string; notify: boolean; finishedAt: string }) {
  if (!change.value || busy.value) return
  busy.value = true
  changeError.value = ''
  try {
    if (change.value.finishedAt === undefined) {
      await api.endFloodPoint(change.value.id, {
        password: value.password,
        notify: value.notify,
      })
      store.itemsRaw = store.itemsRaw.filter((item) => String(item.id) !== String(change.value?.id))
    } else {
      const updated = await api.updateFloodPoint(change.value.id, {
        password: value.password,
        notify: value.notify,
        finished_at: new Date(value.finishedAt).toISOString(),
      })
      store.itemsRaw = store.itemsRaw.map((item) =>
        String(item.id) === String(updated.id) ? updated : item,
      )
    }
    change.value = null
    toast.success('Ponto de alagamento atualizado.')
  } catch (cause) {
    changeError.value = parseApiError(
      cause,
      'Não foi possível alterar o ponto de alagamento.',
    ).message
  } finally {
    busy.value = false
  }
}

function probabilityTone(probability: number) {
  if (probability > 70) {
    return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200'
  }
  if (probability > 40) {
    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
}
</script>

<template>
  <section
    class="grid min-h-0"
    :class="
      String(route.name) === 'Administração'
        ? ''
        : props.externalScroll
          ? ''
          : 'max-h-[40%] overflow-y-auto pr-1 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]'
    "
    aria-label="Pontos atuais"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="mt-0.5 text-lg font-semibold">Pontos atuais</h3>
    </div>

    <div
      v-if="points.length"
      class="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]"
      tabindex="0"
      role="region"
      aria-label="Tabela de pontos atuais; role horizontalmente quando necessário"
    >
      <table class="w-full min-w-[28rem] table-fixed border-separate border-spacing-y-2">
        <thead class="sticky top-0 z-10 bg-white dark:bg-[#001C3B]">
          <tr
            class="text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400"
          >
            <th scope="col" class="w-[46%] px-3 py-2">Bairro</th>
            <th scope="col" class="w-[30%] px-3 py-2">Probabilidade</th>
            <th scope="col" class="w-[24%] px-3 py-2 text-right">Duração</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="point in points"
            :key="point.id"
            class="text-sm text-slate-700 dark:text-slate-200"
          >
            <td
              class="rounded-l-xl border-y border-l border-slate-200 bg-slate-50 px-3 py-3 font-semibold dark:border-slate-700 dark:bg-[#071F36]"
            >
              <span class="line-clamp-2">{{ point.neighborhood }}</span>
              <div v-if="canManage" class="mt-2 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  class="min-h-11 rounded-lg border px-2"
                  @click="openChange(point, false)"
                >
                  Alterar prazo
                </button>
                <button
                  type="button"
                  class="min-h-11 rounded-lg border border-red-700 px-2 text-red-700 dark:text-red-300"
                  @click="openChange(point, true)"
                >
                  Encerrar ponto
                </button>
              </div>
            </td>
            <td
              class="border-y border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-[#071F36]"
            >
              <span
                class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold"
                :class="probabilityTone(point.probability)"
              >
                <span class="size-2 rounded-full bg-current" aria-hidden="true"></span>
                {{ point.probability > 70 ? 'Alta' : point.probability > 40 ? 'Média' : 'Baixa' }}
              </span>
            </td>
            <td
              class="rounded-r-xl border-y border-r border-slate-200 bg-slate-50 px-3 py-3 text-right font-semibold whitespace-nowrap dark:border-slate-700 dark:bg-[#071F36]"
            >
              {{ formatDuration(point.duration) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[#071F36] dark:text-slate-200"
      role="status"
    >
      <span class="material-symbols-outlined mt-0.5 shrink-0 text-slate-500" aria-hidden="true">
        water_drop
      </span>
      <div>
        <p class="font-semibold">Nenhum ponto atual</p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Não há pontos cadastrados para exibir neste momento.
        </p>
      </div>
    </div>
    <AdminPasswordDialog
      v-if="change"
      :title="
        change.finishedAt === undefined
          ? 'Encerrar ponto de alagamento?'
          : 'Alterar prazo do alagamento'
      "
      :description="
        change.finishedAt === undefined
          ? `O ponto em ${change.name} deixará de aparecer no mapa ativo. Seu histórico será preservado.`
          : `Antecipe ou prorrogue o término do ponto em ${change.name}.`
      "
      :finished-at="change.finishedAt"
      notifications
      :busy="busy"
      :error="changeError"
      @cancel="change = null"
      @confirm="confirmChange"
    />
  </section>
</template>
