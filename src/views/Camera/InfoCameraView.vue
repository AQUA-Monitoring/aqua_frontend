<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CameraInspectionPanel } from '@/modules/cameras'
import { useCamerasMonitoring } from '@/modules/cameras'
import type { CameraApiItem } from '@/modules/cameras'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { getById, error } = useCamerasMonitoring({ autoLoad: false })
const camera = ref<CameraApiItem | null>(null)
const loading = ref(false)
let requestSequence = 0

watch(
  () => props.id,
  async (id) => {
    const sequence = ++requestSequence
    loading.value = true
    camera.value = null
    const nextCamera = await getById(id)
    if (sequence !== requestSequence) return
    camera.value = nextCamera
    loading.value = false
  },
  { immediate: true },
)

function close() {
  router.push('/cameras')
}
</script>

<template>
  <main class="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-10">
    <div v-if="loading" class="grid min-h-64 place-items-center text-slate-500" role="status">
      Carregando detalhes da câmera...
    </div>
    <CameraInspectionPanel
      v-else-if="camera"
      :camera="camera"
      nearby-layout="side"
      @close="close"
    />
    <div v-else class="grid min-h-64 place-items-center text-center">
      <div>
        <h1 class="text-2xl font-semibold">{{ error ? 'Não foi possível consultar a câmera' : 'Câmera não encontrada' }}</h1>
        <p class="mt-2 text-slate-600">{{ error || 'A câmera solicitada não está disponível.' }}</p>
        <button
          class="mt-5 rounded-xl bg-[#2768CA] px-5 py-3 font-semibold text-white"
          @click="close"
        >
          Voltar para câmeras
        </button>
      </div>
    </div>
  </main>
</template>
