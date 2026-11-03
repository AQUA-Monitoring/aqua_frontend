import { translateUi } from '@/app/i18n'
import { computed, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { CameraCreateFormState, CameraCreateStep } from '../types/cameraCreate'

export function useUnsavedCameraGuard(
  form: CameraCreateFormState,
  currentStep: Ref<CameraCreateStep>,
  allowNavigation: Ref<boolean>,
) {
  const hasUnsavedChanges = computed(
    () =>
      currentStep.value !== 4 &&
      Object.entries(form).some(([key, value]) =>
        key === 'country' ? value !== 'Brasil' : value !== '' && value !== null,
      ),
  )

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value || allowNavigation.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeRouteLeave(() => {
    if (allowNavigation.value || !hasUnsavedChanges.value) return true
    return window.confirm(translateUi('Há alterações não salvas neste cadastro. Deseja sair mesmo assim?'))
  })

  return {
    hasUnsavedChanges,
  }
}
