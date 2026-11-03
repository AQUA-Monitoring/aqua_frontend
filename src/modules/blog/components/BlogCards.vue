<script setup lang="ts">
import { onMounted } from 'vue'
import { useBlogStore } from '../blogStore'
import { blogMediaUrl } from '../blogMedia'

const blogStore = useBlogStore()

onMounted(async () => {
  await blogStore.getNewsBlog()
})
</script>

<template>
  <h2 class="font-semibold mb-10 text-2xl pl-13 pt-0 md:text-3xl lg:text-4xl">Explore</h2>

  <ul class="grid lg:grid-cols-4 gap-10 p-19 pt-0 place-content-center">
    <li v-for="(notice, index) in blogStore.blogs" :key="index">
      <RouterLink
        :to="$localePath(`/blog/${notice.id}`)"
        class="relative h-100 flex flex-col lg:flex-row overflow-hidden rounded-2xl cursor-pointer group bg-[#0453AF] hover:shadow-2xl transition duration-300 hover:-translate-y-2"
      >
        <img
          v-if="notice.banner_image"
          :src="blogMediaUrl(notice.banner_image.url)"
          :alt="notice.title"
          class="rounded-2xl w-full h-full object-cover"
        />

        <div
          class="absolute inset-0 bg-[#0453AF]/20 opacity-50 group-hover:opacity-10 transition duration-300"
        ></div>

        <div class="absolute bottom-4 left-2 text-white">
          <h3 class="text-2xl md:text-xl font-semibold">{{ notice.title }}</h3>
          <p>{{ notice.subject }}</p>
        </div>
      </RouterLink>
    </li>
  </ul>
</template>
