import { translateUi } from '@/app/i18n'
import { formatLocale } from '@/app/i18n'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import axios from 'axios'
import { toast } from 'vue3-toastify'
import {
  AddressingApi,
  isReferenceBaseChangedError,
  parseTerritoryApiError,
  REFERENCE_BASE_TEXT,
  useNeighborhood,
  type ResolveReferenceArea,
} from '@/modules/addressing'
import { useFloodPointOfflineQueue } from './useFloodPointOfflineQueue'
import FloodPointsApi from '../services/FloodPoints'
import { formatFloodPointNeighborhoodSummary } from '../floodPointAdapter'
import { useFloodPointDraftStore } from '../stores/FloodPointDraft'
import { useFloodPointsStore } from '../stores/FloodPoints'
import type { CreateFloodPointPayload } from '../types/floodPoints'
import { formatTerritoryLabel } from '@/shared'
import { localePath } from '@/app/i18n'

const MAX_DURATION_MINUTES = 10080
const FORM_STORAGE_KEY = 'aqua:flood-point-form-draft'

export function useFloodPointRegistration() {
  const addressingApi = new AddressingApi()
  const floodPointsApi = new FloodPointsApi()
  const floodDraft = useFloodPointDraftStore()
  const floodPointsStore = useFloodPointsStore()
  const offlineQueue = useFloodPointOfflineQueue()
  const router = useRouter()
  const {
    loadNeighborhoods,
    getLocalization,
    getIntersectingLocalizations,
    catalogSource,
    loadingTerritories,
    catalogError,
    referenceBaseRevision,
  } = useNeighborhood()

  const form = reactive({
    city: '',
    cityId: '',
    neighborhood: '',
    neighborhoodId: '',
    possibility: '',
    duration: '',
  })
  const currentStep = ref<1 | 2 | 3>(1)
  const locationIsManual = ref(false)
  const showStepErrors = ref(false)
  const isSubmitting = ref(false)
  const allowNavigation = ref(false)
  const resolvedArea = ref<ResolveReferenceArea | null>(null)
  const probabilityPresets = [
    { value: 30, label: 'Baixo', description: 'Atenção', color: '#46A758' },
    { value: 60, label: 'Moderado', description: 'Alerta', color: '#E0B400' },
    { value: 85, label: 'Alto', description: 'Crítico', color: '#E5484D' },
  ]
  const durationPresets = [30, 60, 120, 360, 720]

  const normalizedCity = computed(() => form.city.trim())
  const normalizedNeighborhood = computed(() => form.neighborhood.trim())
  const canonicalTerritoryConfirmed = computed(
    () => catalogSource.value === 'canonical' && Boolean(form.cityId && form.neighborhoodId),
  )
  const probabilityValue = computed<number | null>(() => {
    if (form.possibility === '') return null
    const parsed = Number(String(form.possibility).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  })
  const durationValue = computed<number | null>(() => {
    if (form.duration === '') return null
    const parsed = Number(String(form.duration).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  })
  const locationErrors = computed(() => {
    const errors: string[] = []
    if (!floodDraft.hasGeometry) errors.push('Marque a área afetada no mapa para continuar.')
    if (!normalizedCity.value) errors.push('Confirme a cidade da área marcada.')
    if (!normalizedNeighborhood.value) errors.push('Confirme o bairro da área marcada.')
    if (catalogSource.value === 'canonical' && !canonicalTerritoryConfirmed.value)
      errors.push(REFERENCE_BASE_TEXT.invalidArea)
    if (catalogSource.value !== 'canonical')
      errors.push(REFERENCE_BASE_TEXT.waitToPublish)
    return errors
  })
  const riskErrors = computed(() => {
    const errors: string[] = []
    if (probabilityValue.value === null)
      errors.push('Selecione o nível de risco ou informe uma probabilidade.')
    else if (probabilityValue.value < 0 || probabilityValue.value > 100)
      errors.push('A probabilidade deve ficar entre 0 e 100%.')
    if (durationValue.value === null)
      errors.push('Selecione por quanto tempo o alerta ficará ativo.')
    else if (!Number.isInteger(durationValue.value) || durationValue.value <= 0)
      errors.push('A duração deve ser um número inteiro maior que zero.')
    else if (durationValue.value > MAX_DURATION_MINUTES)
      errors.push('A duração máxima permitida é de 7 dias.')
    return errors
  })
  const validationErrors = computed(() => [...locationErrors.value, ...riskErrors.value])
  const canSubmit = computed(() => !validationErrors.value.length && !isSubmitting.value)
  const hasUnsavedChanges = computed(
    () =>
      floodDraft.hasGeometry ||
      Boolean(form.city || form.neighborhood || form.possibility || form.duration),
  )
  const previewFinishedAt = computed(() => {
    if (durationValue.value === null || durationValue.value <= 0) return null
    return new Date(Date.now() + durationValue.value * 60000).toLocaleString(formatLocale(), {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  })
  const riskLevel = computed(() => {
    const value = probabilityValue.value
    if (value === null) return null
    if (value <= 40) return probabilityPresets[0]
    if (value <= 70) return probabilityPresets[1]
    return probabilityPresets[2]
  })
  const durationLabel = computed(() => {
    const minutes = durationValue.value
    if (minutes === null) return 'Não informada'
    if (minutes < 60) return `${minutes} min`
    if (minutes % 1440 === 0) return `${minutes / 1440} dia${minutes > 1440 ? 's' : ''}`
    if (minutes % 60 === 0) return `${minutes / 60} h`
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
  })
  const geometrySummary = computed(() => {
    const count = floodDraft.drawnFeatures.length
    if (!count) return 'Nenhuma área marcada'
    return `${count} área${count > 1 ? 's' : ''} marcada${count > 1 ? 's' : ''}`
  })
  const affectedNeighborhoods = computed(() => {
    const resolution = resolvedArea.value
    if (resolution) {
      return resolution.neighborhoods.map((item) => ({
        city: resolution.city.name,
        cityId: resolution.city.referenceCityId,
        neighborhood: item.name,
        neighborhoodId: item.referenceNeighborhoodId,
      }))
    }
    return getIntersectingLocalizations(floodDraft.drawnFeatures)
  })
  const affectedNeighborhoodLabels = computed(() =>
    affectedNeighborhoods.value
      .map((item) => formatTerritoryLabel(item.neighborhood))
      .filter(Boolean),
  )
  const neighborhoodSummary = computed(() =>
    formatFloodPointNeighborhoodSummary(
      normalizedNeighborhood.value,
      affectedNeighborhoods.value.map((item) => ({ name: item.neighborhood })),
    ),
  )

  function applyLocalizationFromArea() {
    resolvedArea.value = null
    const point = floodDraft.centroid
    if (!point) {
      floodDraft.setLocalization(null)
      Object.assign(form, { city: '', cityId: '', neighborhood: '', neighborhoodId: '' })
      return
    }
    const localization = getLocalization(point.lng, point.lat)
    floodDraft.setLocalization(localization)
    if (!localization) {
      Object.assign(form, { city: '', cityId: '', neighborhood: '', neighborhoodId: '' })
      return
    }
    Object.assign(form, {
      city: localization.city,
      cityId: localization.cityId ?? '',
      neighborhood: localization.neighborhood,
      neighborhoodId: localization.neighborhoodId ?? '',
    })
    locationIsManual.value = false
  }

  function setProbability(value: number) {
    form.possibility = String(value)
  }
  function setDuration(value: number) {
    form.duration = String(value)
  }
  function buildPayload(): CreateFloodPointPayload | null {
    if (probabilityValue.value === null || durationValue.value === null) return null
    const representativePoint = floodDraft.centroid
    return {
      city: form.cityId || normalizedCity.value,
      neighborhood: form.neighborhoodId || normalizedNeighborhood.value,
      possibility: probabilityValue.value,
      duration: durationValue.value,
      finished_at: new Date(Date.now() + durationValue.value * 60000).toISOString(),
      props: floodDraft.drawnFeatures,
      location: representativePoint
        ? { type: 'Point', coordinates: [representativePoint.lng, representativePoint.lat] }
        : null,
      footprint: floodDraft.footprint,
      ...(referenceBaseRevision.value
        ? { reference_base_revision: referenceBaseRevision.value }
        : {}),
    }
  }
  function applyReferenceResolution(resolution: ResolveReferenceArea) {
    const cityId = resolution.city.referenceCityId
    const primaryNeighborhood = resolution.neighborhood
    const neighborhoodId = primaryNeighborhood?.referenceNeighborhoodId
    if (!cityId || !primaryNeighborhood || !neighborhoodId) {
      throw new Error(REFERENCE_BASE_TEXT.invalidArea)
    }
    if (!resolution.referenceBaseRevision) {
      throw new Error(REFERENCE_BASE_TEXT.waitToPublish)
    }

    Object.assign(form, {
      city: resolution.city.name,
      cityId,
      neighborhood: primaryNeighborhood.name,
      neighborhoodId,
    })
    floodDraft.setLocalization({
      city: resolution.city.name,
      cityId,
      neighborhood: primaryNeighborhood.name,
      neighborhoodId,
    })
    referenceBaseRevision.value = resolution.referenceBaseRevision
    resolvedArea.value = resolution
  }
  async function resolvePayloadWithReferenceBase(
    payload: CreateFloodPointPayload,
  ): Promise<CreateFloodPointPayload> {
    if (!referenceBaseRevision.value || !payload.footprint) return payload

    const resolution = await addressingApi.resolveReferenceArea({
      footprint: payload.footprint,
    })
    applyReferenceResolution(resolution)

    return {
      ...payload,
      city: resolution.city.referenceCityId ?? payload.city,
      neighborhood: resolution.neighborhood?.referenceNeighborhoodId ?? payload.neighborhood,
      location: resolution.representativePoint,
      reference_base_revision: resolution.referenceBaseRevision,
    }
  }
  function goToStep(step: 1 | 2 | 3) {
    const errors =
      step === 2 ? locationErrors.value : [...locationErrors.value, ...riskErrors.value]
    if (step > 1 && errors.length) {
      showStepErrors.value = true
      toast.error(errors[0])
      return
    }
    showStepErrors.value = false
    currentStep.value = step
  }
  function clearSavedForm() {
    window.localStorage.removeItem(FORM_STORAGE_KEY)
  }
  function resetAll() {
    Object.assign(form, {
      city: '',
      cityId: '',
      neighborhood: '',
      neighborhoodId: '',
      possibility: '',
      duration: '',
    })
    currentStep.value = 1
    locationIsManual.value = false
    resolvedArea.value = null
    floodDraft.clearDraft()
    clearSavedForm()
  }
  async function handleSubmit() {
    if (validationErrors.value.length) {
      showStepErrors.value = true
      toast.error(validationErrors.value[0])
      return
    }
    let payload = buildPayload()
    if (!payload) return
    try {
      isSubmitting.value = true
      if (!navigator.onLine) {
        offlineQueue.enqueue(payload)
        allowNavigation.value = true
        resetAll()
        toast.info('Sem conexão. O alerta será publicado automaticamente quando a rede voltar.')
        router.push(localePath('/admin'))
        return
      }
      payload = await resolvePayloadWithReferenceBase(payload)
      await floodPointsApi.createFloodPoint(payload)
      await floodPointsStore.refresh()
      allowNavigation.value = true
      resetAll()
      toast.success('Alerta de alagamento publicado com sucesso.')
      router.push(localePath('/admin'))
    } catch (error: unknown) {
      if (isReferenceBaseChangedError(error)) {
        toast.error(REFERENCE_BASE_TEXT.changed)
        return
      }
      if (axios.isAxiosError(error) && !error.response) {
        offlineQueue.enqueue(payload)
        allowNavigation.value = true
        resetAll()
        toast.info('A conexão falhou. O alerta ficou salvo para sincronização automática.')
        router.push(localePath('/admin'))
        return
      }
      toast.error(
        parseTerritoryApiError(error, 'Não foi possível publicar o alerta de alagamento.').message,
      )
    } finally {
      isSubmitting.value = false
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges.value || allowNavigation.value) return
    event.preventDefault()
  }
  watch(() => floodDraft.centroid, applyLocalizationFromArea, { deep: true })
  watch(
    [() => ({ ...form }), currentStep, locationIsManual],
    () => {
      if (!hasUnsavedChanges.value) return clearSavedForm()
      window.localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify({
          form: { ...form },
          step: currentStep.value,
          locationIsManual: locationIsManual.value,
        }),
      )
    },
    { deep: true },
  )
  onMounted(async () => {
    try {
      const saved = window.localStorage.getItem(FORM_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          form?: Partial<typeof form>
          step?: 1 | 2 | 3
          locationIsManual?: boolean
        }
        Object.assign(form, parsed.form ?? {})
        if ([1, 2, 3].includes(parsed.step ?? 0)) currentStep.value = parsed.step ?? 1
        locationIsManual.value = Boolean(parsed.locationIsManual)
      }
    } catch {
      clearSavedForm()
    }
    await loadNeighborhoods()
    applyLocalizationFromArea()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })
  onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
  onBeforeRouteLeave(() => {
    if (allowNavigation.value || !hasUnsavedChanges.value) return true
    return window.confirm(
      translateUi('Há um cadastro em andamento. Deseja sair e manter o rascunho para depois?'),
    )
  })

  return {
    floodDraft,
    form,
    currentStep,
    locationIsManual,
    showStepErrors,
    isSubmitting,
    probabilityPresets,
    durationPresets,
    MAX_DURATION_MINUTES,
    catalogSource,
    loadingTerritories,
    catalogError,
    probabilityValue,
    durationValue,
    locationErrors,
    riskErrors,
    canSubmit,
    previewFinishedAt,
    riskLevel,
    durationLabel,
    geometrySummary,
    affectedNeighborhoods,
    affectedNeighborhoodLabels,
    neighborhoodSummary,
    setProbability,
    setDuration,
    goToStep,
    handleSubmit,
  }
}
