<script setup lang="ts">
import type { ISupport } from './supportTypes'

defineProps<{
  support: ISupport
}>()
</script>

<template>
  <div class="rounded-4xl p-4 shadow-[0_0_8px_rgba(0,0,0,0.1)] text-sm">
    <div class="mt-3 space-y-2 px-3 font-semibold">
      <p>
        Código de suporte:
        <span class="text-gray-500">{{ support.code }}</span>
      </p>
      <p>
        Suporte solicitado em:
        <span class="text-gray-500">{{ support.requestedAt }}</span>
      </p>
      <p>
        Categoria:
        <span class="text-gray-500">{{ support.category }}</span>
      </p>

      <p class="flex items-center gap-2">
        <span>Status:</span>

        <span
          :class="[
            'px-3 py-1 rounded-full text-xs font-bold',
            support.status.toLowerCase() == 'concluído'
              ? 'bg-green-100 text-green-700'
              : support.status.toLowerCase() == 'pendente'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700',
          ]"
        >
          {{ support.status }}
        </span>
      </p>
    </div>

    <RouterLink
      :to="$localePath(`/chat/${support.id}`)"
      class="block w-full rounded-full border-2 border-[#2768CA] py-2 text-center font-semibold text-[#2768CA] mt-4"
    >
      Ver detalhes
    </RouterLink>
  </div>
</template>
