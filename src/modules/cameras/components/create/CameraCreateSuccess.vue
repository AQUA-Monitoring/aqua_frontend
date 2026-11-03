<script setup lang="ts">
import type { CameraApiItem } from '../../types/camera'

defineProps<{
  camera: CameraApiItem | null
}>()
</script>

<template>
  <div
    class="mx-auto mt-8 max-w-2xl rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
  >
    <span class="material-symbols-outlined text-6xl" aria-hidden="true">check_circle</span>
    <h2 class="mt-3 text-2xl font-semibold">Câmera cadastrada</h2>
    <p class="mt-2">
      O registro foi criado inativo. Valide a transmissão e as permissões antes de solicitar sua
      ativação.
    </p>
    <p v-if="camera && !camera.region" class="mt-3 text-sm font-medium">
      O bairro ainda não está vinculado a uma região ativa da Base georreferenciada oficial; a ativação permanecerá bloqueada até a
      regularização territorial.
    </p>

    <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
      <RouterLink
        :to="$localePath('/admin')"
        class="min-h-12 rounded-xl border border-emerald-700 px-5 py-3 font-semibold"
      >
        Voltar à administração
      </RouterLink>

      <RouterLink
        v-if="camera"
        :to="`/cameras/${camera.id}`"
        class="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
      >
        Ver cadastro
      </RouterLink>
    </div>
  </div>
</template>
