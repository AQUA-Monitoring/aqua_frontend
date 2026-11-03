import { formatLocale } from '@/app/i18n'
import type {
  FloodDemoPrediction,
  FloodDemoPredictionBatch,
  FloodDemoPredictionBatchItem,
  FloodDemoStatus,
} from './floodDemo'

export const floodDemoStatusContent: Record<
  FloodDemoStatus,
  { label: string; message: string; icon: string }
> = {
  disabled: {
    label: 'Demo desativada',
    message: 'A transmissão de demonstração está desativada.',
    icon: 'power_settings_new',
  },
  starting: {
    label: 'Preparando transmissão',
    message: 'O vídeo está sendo preparado. Aguarde alguns instantes.',
    icon: 'hourglass_top',
  },
  ready: {
    label: 'Demonstração pronta',
    message: 'A transmissão está disponível para inspeção.',
    icon: 'sensors',
  },
  unavailable: {
    label: 'Transmissão indisponível',
    message: 'O serviço da transmissão não está disponível.',
    icon: 'cloud_off',
  },
  error: {
    label: 'Falha na transmissão',
    message: 'Não foi possível iniciar ou manter a transmissão.',
    icon: 'error',
  },
}

export function hasFloodDemoAnalysis(prediction: FloodDemoPrediction | null) {
  return Boolean(
    prediction?.model.ready === true &&
    prediction.model.fallback === false &&
    prediction.prediction.probabilities !== null &&
    ['normal', 'medium', 'flooded'].includes(prediction.prediction.state),
  )
}

export function floodDemoResult(
  prediction: FloodDemoPrediction | null,
  predictionLoading: boolean,
  analysisAvailable: boolean,
  predictionMessage: string | null,
  analysisUnavailable: boolean,
) {
  if (predictionLoading && !prediction)
    return {
      label: 'Análise em andamento',
      message: 'Os frames da demonstração estão sendo processados.',
      tone: 'neutral',
      icon: 'progress_activity',
    }
  if (!analysisAvailable && analysisUnavailable)
    return {
      label: 'Análise indisponível',
      message: predictionMessage || 'O serviço de análise não está disponível no momento.',
      tone: 'neutral',
      icon: 'info',
    }
  if (!analysisAvailable)
    return {
      label: 'Sincronizando análise',
      message: predictionMessage || 'Aguardando a predição correspondente ao trecho exibido.',
      tone: 'neutral',
      icon: 'sync',
    }
  if (prediction?.prediction.state === 'flooded')
    return {
      label: 'Indício de alagamento',
      message: 'A análise automática encontrou sinais compatíveis com alagamento.',
      tone: 'risk',
      icon: 'flood',
    }
  if (prediction?.prediction.state === 'medium')
    return {
      label: 'Atenção: possível alagamento',
      message: 'A análise automática encontrou sinais que exigem inspeção.',
      tone: 'attention',
      icon: 'warning',
    }
  return {
    label: 'Sem indício na análise',
    message: 'A análise automática não encontrou indício de alagamento.',
    tone: 'safe',
    icon: 'check_circle',
  }
}

export function floodDemoResultTone(tone: string) {
  if (tone === 'risk')
    return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200'
  if (tone === 'attention')
    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
  if (tone === 'safe')
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
  return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
}

export function floodDemoProbabilityRows(prediction: FloodDemoPrediction | null) {
  const probabilities = hasFloodDemoAnalysis(prediction)
    ? prediction?.prediction.probabilities
    : null
  if (!probabilities) return []
  return [
    { state: 'normal', label: 'Sem indício', value: probabilities.normal, color: 'bg-emerald-600' },
    {
      state: 'medium',
      label: 'Possível alagamento',
      value: probabilities.medium,
      color: 'bg-amber-500',
    },
    {
      state: 'flooded',
      label: 'Indício de alagamento',
      value: probabilities.flooded,
      color: 'bg-red-600',
    },
  ].filter(
    (row): row is { state: string; label: string; value: number; color: string } =>
      typeof row.value === 'number' && Number.isFinite(row.value),
  )
}

export function floodDemoSampleRows(prediction: FloodDemoPrediction | null) {
  if (!hasFloodDemoAnalysis(prediction)) return []
  return (prediction?.prediction.samples ?? []).slice(0, 3).map((sample, position) => ({
    index: Number.isFinite(sample.index) ? sample.index : position + 1,
    state: sample.state,
    stateLabel: floodDemoAnalysisLabel(sample.state, true),
    probabilities: [
      { state: 'normal', label: 'Sem indício', value: sample.probabilities.normal },
      { state: 'medium', label: 'Possível alagamento', value: sample.probabilities.medium },
      { state: 'flooded', label: 'Indício de alagamento', value: sample.probabilities.flooded },
    ].filter(
      (row): row is { state: string; label: string; value: number } =>
        typeof row.value === 'number' && Number.isFinite(row.value),
    ),
  }))
}

const temporalOffsets = [
  { offset: 2 as const, fallbackLabel: 'Trecho anterior mais antigo' },
  { offset: 1 as const, fallbackLabel: 'Trecho anterior' },
  { offset: 0 as const, label: 'Trecho exibido' },
]

function temporalStatusLabel(item: FloodDemoPredictionBatchItem | undefined) {
  if (!item) return 'Sem dado para este trecho'
  if (item.status === 'missing') return 'Análise ainda não encontrada'
  if (item.status === 'gone') return 'Trecho fora da janela disponível'
  if (item.status === 'error') return item.error?.detail || 'Falha ao analisar este trecho'
  if (!item.prediction) return 'Resultado sem predição'
  return floodDemoAnalysisLabel(item.prediction.prediction.state, hasFloodDemoAnalysis(item.prediction))
}

export function floodDemoTemporalRows(
  batch: FloodDemoPredictionBatch | null,
  representativeImage?: (
    sequence: number,
  ) => { url: string | null; unavailable: boolean } | undefined,
) {
  return temporalOffsets.map(({ offset, ...labels }) => {
    const item = batch?.results.find((result) => result.offset_segments === offset)
    const elapsedSeconds = Math.abs(item?.nominal_offset_seconds ?? Number.NaN)
    const label =
      offset === 0
        ? labels.label
        : Number.isFinite(elapsedSeconds)
          ? `Aprox. ${elapsedSeconds.toLocaleString(formatLocale())} s antes`
          : labels.fallbackLabel
    const prediction =
      item?.status === 'available' && item.prediction && hasFloodDemoAnalysis(item.prediction)
        ? item.prediction
        : null
    return {
      offset,
      label,
      sequence: item?.sequence ?? null,
      status: item?.status ?? 'missing',
      statusLabel: temporalStatusLabel(item),
      source: item?.source ?? null,
      probabilities: floodDemoProbabilityRows(prediction),
      representativeImage:
        item?.sequence === undefined
          ? { url: null, unavailable: false }
          : (representativeImage?.(item.sequence) ?? { url: null, unavailable: false }),
    }
  })
}

export function floodDemoScenarioLabel(state?: string | null) {
  const labels: Record<string, string> = {
    auto: 'Sequência automática',
    normal: 'Sem alagamento esperado',
    medium: 'Cenário intermediário',
    flooded: 'Alagamento esperado',
    unknown: 'Sem estado esperado',
  }
  return state ? (labels[state] ?? state) : 'Sem referência esperada'
}

export function floodDemoAnalysisLabel(state: string | null | undefined, available: boolean) {
  if (!available) return 'Análise indisponível'
  if (state === 'flooded') return 'Indício de alagamento'
  if (state === 'medium') return 'Atenção: possível alagamento'
  if (state === 'normal') return 'Sem indício na análise'
  return 'Análise indisponível'
}

export function floodDemoStatusTone(status?: FloodDemoStatus) {
  if (status === 'ready')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
  if (status === 'starting')
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
  return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
}
