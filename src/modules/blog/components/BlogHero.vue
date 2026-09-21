<script setup lang="ts">
const urlBanner =
  'https://api-aqua.michalski.app/media/images/31063604-280d-4143-a9d0-25dd7ec1b904.png'
</script>

<template>
  <div
    class="min-h-100 md:h-135 rounded-b-[8vw] bg-cover bg-center flex items-center"
    :style="{
      backgroundImage: `url(${urlBanner})`,
    }"
  >
    <div class="text-white px-8 md:px-14">
      <h1 class="grid text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1]">
        <span>Blog</span>
        <span>Informativo</span>
      </h1>

      <p class="max-w-82.5">
        Entenda e acompanhe as informações sobre enchentes e o impacto das chuvas em
        <span class="font-bold">Joinville</span>.
      </p>
    </div>
  </div>
</template>
