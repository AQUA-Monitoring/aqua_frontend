<template>
  <section class="flex min-h-screen flex-col items-center justify-center p-6 text-center">
    <h1 class="mb-4 text-6xl font-extrabold dark:text-white">404</h1>
    <p class="mb-6 text-xl text-gray-600 dark:text-gray-300">{{ $l('Ops! Página não encontrada.', 'Sorry! Page not found.') }}</p>
    <p class="mb-8 text-gray-500 dark:text-gray-400">
      {{ $l('A página que você está procurando não existe ou foi movida.', 'The page you are looking for does not exist or has been moved.') }}
    </p>
    <RouterLink
      :to="$localePath('/')"
      class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow transition-colors hover:bg-blue-700"
    >
      {{ $l('Voltar para a página inicial', 'Back to home') }}
    </RouterLink>
  </section>
</template>
