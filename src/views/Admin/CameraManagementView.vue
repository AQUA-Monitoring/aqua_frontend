<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import { useTerritoryCatalog } from '@/modules/addressing'
import {
  CameraManagementEditor,
  CameraManagementList,
  useCameraManagementWorkspace,
} from '@/modules/cameras'
import type { CameraUpdatePayload } from '@/modules/cameras'
import { CatalogFilterPanel, parseApiError } from '@/shared'

const route = useRoute()
const router = useRouter()
const territory = useTerritoryCatalog()
const normalizeTerritoryFilters = async (regionId: string, neighborhoodId: string) => {
  await territory.load()
  return territory.available.value
    ? territory.normalizePair(regionId, neighborhoodId)
    : { regionId, neighborhoodId }
}
const workspace = useCameraManagementWorkspace(route, router, normalizeTerritoryFilters)
const neighborhoodOptions = computed(() =>
  territory.neighborhoodsFor(workspace.filters.region_id),
)
const activeFilterCount = computed(
  () =>
    [
      workspace.filters.region_id,
      workspace.filters.neighborhood_id,
      workspace.filters.administrative_status,
      workspace.filters.stream_status,
      workspace.filters.analysis_status,
    ].filter(Boolean).length,
)

watch(
  () => workspace.filters.region_id,
  () => {
    if (
      territory.available.value &&
      !territory.isValidPair(
        workspace.filters.region_id,
        workspace.filters.neighborhood_id,
      )
    ) {
      workspace.filters.neighborhood_id = ''
    }
  },
)

async function save(payload: CameraUpdatePayload) {
  try {
    await workspace.save(payload)
    toast.success('Câmera atualizada.')
  } catch (cause) {
    toast.error(parseApiError(cause, 'Não foi possível atualizar a câmera.').message)
  }
}

function editLocation() {
  const id = workspace.selected.value?.id
  if (!id) return
  workspace.runGuarded(async () => {
    await router.push({
      path: `/admin/cameras/${id}/localizacao`,
      query: { return_to: route.fullPath },
    })
  })
}
</script>

<template>
  <section class="mx-auto w-full max-w-[1600px] px-4 py-5 dark:text-white sm:px-6 lg:px-0">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold tracking-[0.16em] text-[#2768CA] uppercase dark:text-blue-300">Operação</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
          Gerenciar câmeras
        </h1>
        <p class="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
          Atualize transmissão e disponibilidade. A localização continua no fluxo dedicado.
        </p>
      </div>
      <RouterLink
        to="/admin/cameras/cadastro"
        class="min-h-11 rounded-xl bg-[#2768CA] px-4 py-2.5 font-semibold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#2768CA]"
      >
        Cadastrar câmera
      </RouterLink>
    </header>

    <CatalogFilterPanel
      v-model:open="workspace.filtersOpen.value"
      class="mt-6"
      :active-count="activeFilterCount"
      :busy="workspace.loading.value"
      filters-class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      @apply="workspace.applyFilters"
      @clear="workspace.clearFilters"
    >
      <template #search>
        <label class="relative block">
          <span class="sr-only">Buscar câmera ou endereço</span>
          <span
            class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
            >search</span
          >
          <input
            v-model="workspace.filters.search"
            type="search"
            class="min-h-12 w-full rounded-2xl border border-slate-300 bg-transparent pr-4 pl-11 outline-none focus:border-[#2768CA] focus:ring-3 focus:ring-[#2768CA]/15 dark:border-slate-600"
            placeholder="Buscar câmera, rua ou bairro"
          />
        </label>
      </template>

      <label class="grid gap-1 text-xs font-semibold">
        Região
        <select
          v-model="workspace.filters.region_id"
          :disabled="territory.loading.value || !territory.available.value"
          class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal disabled:opacity-60 dark:border-slate-600 dark:bg-[#00182F]"
        >
          <option value="">Todas</option>
          <option v-for="item in territory.regions.value" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-semibold">
        Bairro
        <select
          v-model="workspace.filters.neighborhood_id"
          :disabled="territory.loading.value || !territory.available.value"
          class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal disabled:opacity-60 dark:border-slate-600 dark:bg-[#00182F]"
        >
          <option value="">Todos</option>
          <option v-for="item in neighborhoodOptions" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-semibold">
        Estado administrativo
        <select
          v-model="workspace.filters.administrative_status"
          class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
        >
          <option value="">Todos</option>
          <option value="ACTIVE">Ativa</option>
          <option value="INACTIVE">Inativa</option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-semibold">
        Transmissão
        <select
          v-model="workspace.filters.stream_status"
          class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
        >
          <option value="">Todas</option>
          <option value="UNKNOWN">Não verificada</option>
          <option value="CHECKING">Verificando</option>
          <option value="ONLINE">Disponível</option>
          <option value="UNAVAILABLE">Indisponível</option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-semibold">
        Análise
        <select
          v-model="workspace.filters.analysis_status"
          class="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal dark:border-slate-600 dark:bg-[#00182F]"
        >
          <option value="">Todas</option>
          <option value="NOT_ANALYZED">Não analisada</option>
          <option value="RUNNING">Em andamento</option>
          <option value="AVAILABLE">Disponível</option>
          <option value="STALE">Desatualizada</option>
          <option value="NO_FRAME">Sem imagem</option>
          <option value="MODEL_UNAVAILABLE">Modelo indisponível</option>
          <option value="ERROR">Erro</option>
        </select>
      </label>
      <p
        v-if="territory.error.value"
        class="text-xs text-amber-700 sm:col-span-2 xl:col-span-5 dark:text-amber-300"
        role="status"
      >
        {{ territory.error.value }} Os demais filtros continuam disponíveis.
      </p>
    </CatalogFilterPanel>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p v-if="!workspace.error.value" class="text-sm text-slate-500 dark:text-slate-400">
        <strong class="text-slate-800 dark:text-white">{{ workspace.count.value }}</strong>
        câmera{{ workspace.count.value === 1 ? '' : 's' }} encontrada{{
          workspace.count.value === 1 ? '' : 's'
        }}
      </p>
      <button
        type="button"
        class="min-h-11 rounded-xl border border-[#2768CA] px-4 text-sm font-semibold text-[#2768CA] disabled:opacity-60 dark:text-blue-300"
        :disabled="workspace.loading.value || workspace.refreshing.value"
        @click="workspace.refresh"
      >
        {{ workspace.refreshing.value ? 'Atualizando…' : 'Atualizar dados' }}
      </button>
    </div>

    <p
      v-if="workspace.error.value"
      class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
      role="alert"
    >
      {{ workspace.error.value }}
    </p>

    <div class="mt-5 grid min-h-[32rem] gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)]">
      <CameraManagementList
        :cameras="workspace.cameras.value"
        :selected-id="workspace.selected.value?.id"
        :loading="workspace.loading.value"
        :loading-more="workspace.loadingMore.value"
        :has-more="workspace.hasMore.value"
        @select="workspace.selectCamera"
        @load-more="workspace.loadMore"
      />

      <div
        v-if="workspace.selectedLoading.value"
        class="grid min-h-72 place-items-center rounded-3xl border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300"
        role="status"
      >
        Carregando detalhes da câmera…
      </div>
      <div
        v-else-if="workspace.selectedError.value && !workspace.selected.value"
        class="grid min-h-72 place-items-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {{ workspace.selectedError.value }}
      </div>
      <div
        v-else-if="!workspace.selected.value"
        class="hidden min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 lg:grid dark:border-slate-600 dark:text-slate-300"
      >
        Selecione uma câmera para visualizar e editar seus dados.
      </div>
      <CameraManagementEditor
        v-else-if="workspace.selected.value"
        :camera="workspace.selected.value"
        :saving="workspace.saving.value"
        :error="workspace.selectedError.value"
        @close="workspace.closeEditor"
        @dirty-change="workspace.setDirty"
        @save="save"
        @edit-location="editLocation"
      />
    </div>

    <div
      v-if="workspace.discardDialogOpen.value"
      class="fixed inset-0 z-[90] grid place-items-center bg-[#00182F]/70 p-4"
      role="presentation"
    >
      <section
        class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#001C3B]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-camera-title"
      >
        <h2 id="discard-camera-title" class="text-xl font-semibold">
          Descartar alterações não salvas?
        </h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          As mudanças feitas nesta câmera serão perdidas.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="min-h-11 rounded-xl px-4 font-semibold"
            @click="workspace.cancelDiscard"
          >
            Continuar editando
          </button>
          <button
            type="button"
            class="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white"
            @click="workspace.confirmDiscard"
          >
            Descartar
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
