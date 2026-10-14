<script setup lang="ts">
import BlogCards from '../components/BlogCards.vue'
import BlogHero from '../components/BlogHero.vue'

interface Topic {
  title: string
  description: string
}

const topics: Topic[] = [
  {
    title: 'Causas',
    description:
      'Saiba as causas das enchentes em Joinville, como chuvas intensas, marés altas e crescimento urbano',
  },
  {
    title: 'Histórico',
    description:
      'Conheça o histórico das enchentes em Joinville e seus impactos ao longo dos anos.',
  },
  {
    title: 'Dicas',
    description: 'Confira dicas de prevenção e segurança para períodos de enchentes em Joinville.',
  },
]
</script>

<template>
  <section>
    <BlogHero />

    <div class="my-10 grid gap-10">
      <h2 class="font-semibold ml-12 text-2xl md:text-3xl lg:text-4xl">Encontre</h2>
      <ul class="flex flex-col lg:flex-row px-14">
        <li
          v-for="(topic, index) in topics"
          :key="index"
          :class="[
            index == topics.length - 1 ? '' : 'border-b border-[#0453AF] lg:border-r lg:border-b-0',
            'w-full h-auto',
          ]"
        >
          <h3 class="text-[#0453AF] text-xl md:text-2xl p-5 font-semibold dark:text-white">
            {{ topic.title }}
          </h3>
          <p class="p-5 dark:text-[#FFFFFF]">{{ topic.description }}</p>
        </li>
      </ul>
    </div>

    <BlogCards />
  </section>
</template>
