<script setup lang="ts">
import { ref, watch } from 'vue'
import { useBlogStore } from '../blogStore'
import type { INotice } from '../blogTypes'
import { blogMediaUrl } from '../blogMedia'

const props = defineProps<{
  id: string
}>()

const blogStore = useBlogStore()
const post = ref<INotice | null>(null)
const loading = ref(true)
let loadSequence = 0

async function loadPost(id: string) {
  const sequence = ++loadSequence
  loading.value = true
  post.value = null

  try {
    const loadedPost = await blogStore.getNewsById(id)
    if (sequence === loadSequence) post.value = loadedPost
  } catch {
    if (sequence === loadSequence) post.value = null
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(() => props.id, loadPost, { immediate: true })
</script>

<template>
  <section
    v-if="loading"
    class="min-h-80 grid place-items-center px-4 py-12 text-gray-600 dark:text-gray-300"
    role="status"
  >
    Carregando notícia…
  </section>

  <section
    v-else-if="!post"
    class="min-h-80 grid place-items-center px-4 py-12 text-center"
  >
    <div>
      <h1 class="text-2xl font-semibold">Notícia não encontrada</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-300">
        Verifique o endereço ou retorne para a página do blog.
      </p>
      <RouterLink to="/blog" class="mt-5 inline-block font-semibold text-[#0453AF] hover:underline dark:text-blue-300">
        Voltar ao blog
      </RouterLink>
    </div>
  </section>

  <section v-else class="max-w-5xl mx-auto px-4 pb-6 md:py-8">
    <img
      v-if="post.banner_image"
      :src="blogMediaUrl(post.banner_image.url)"
      :alt="post.title"
      class="w-full h-48 md:h-96 object-cover rounded-2xl mb-4 md:mb-6"
    />

    <h1 class="text-xl md:text-3xl font-semibold mb-2 leading-tight dark:text-white">
      {{ post.title }}
    </h1>

    <p class="text-blue-500 text-xs md:text-sm mb-4 md:mb-6 dark:text-blue-300">
      {{ post.author }}
    </p>

    <div class="space-y-4 md:space-y-6 text-gray-700 leading-relaxed text-sm md:text-base dark:text-slate-200">
      <p>
        {{ post.content }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
        <div class="md:col-span-2">
          {{ post.content }}
        </div>

        <div v-if="post.content_image" class="w-full rounded-2xl overflow-hidden">
          <img
            :src="blogMediaUrl(post.content_image.url)"
            :alt="post.content_image.description"
            class="w-full h-full object-contain"
          />
        </div>
      </div>

      <p>
        {{ post.content }}
      </p>
    </div>

    <aside
      v-if="post.reference_title && post.reference_url"
      class="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700"
      aria-labelledby="post-reference-title"
    >
      <h2 id="post-reference-title" class="text-lg font-semibold">Referência</h2>
      <a
        :href="post.reference_url"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-block break-words font-medium text-[#0453AF] hover:underline dark:text-blue-300"
      >
        {{ post.reference_title }}
      </a>
    </aside>
  </section>
</template>
