import { formatLocale } from '@/app/i18n'
import type { CameraAnalysisStatus, CameraApiItem, CameraClassification } from '../types/camera'
import type { CameraWithPrediction } from '@/modules/forecast'
import { formatTerritoryLabel } from '@/shared'

export type CameraPresentationTone = 'risk' | 'attention' | 'safe' | 'neutral' | 'muted'

export interface CameraPresentation {
  label: string
  description: string
  tone: CameraPresentationTone
  rank: number
}

const classificationContent: Record<CameraClassification, CameraPresentation> = {
  FLOOD_INDICATION: {
    label: 'Indício de alagamento',
    description: 'A análise automática encontrou sinais compatíveis com alagamento.',
    tone: 'risk',
    rank: 0,
  },
  INTERMEDIATE_INDICATION: {
    label: 'Atenção: possível alagamento',
    description: 'A análise automática encontrou sinais que exigem inspeção humana.',
    tone: 'attention',
    rank: 1,
  },
  NO_INDICATION: {
    label: 'Sem indício na análise',
    description: 'A análise automática não encontrou indício de alagamento.',
    tone: 'safe',
    rank: 3,
  },
}

const analysisContent: Record<CameraAnalysisStatus, CameraPresentation> = {
  NOT_ANALYZED: {
    label: 'Ainda não analisada',
    description: 'Esta câmera ainda não possui uma análise automática válida.',
    tone: 'muted',
    rank: 4,
  },
  RUNNING: {
    label: 'Análise em andamento',
    description: 'Os frames da câmera estão sendo processados.',
    tone: 'neutral',
    rank: 2,
  },
  AVAILABLE: {
    label: 'Análise indisponível',
    description: 'A resposta não contém uma classificação válida.',
    tone: 'neutral',
    rank: 2,
  },
  STALE: {
    label: 'Análise desatualizada',
    description: 'A última análise disponível está desatualizada e requer nova verificação.',
    tone: 'neutral',
    rank: 2,
  },
  NO_FRAME: {
    label: 'Sem imagem da câmera',
    description: 'Não foi possível obter frames válidos para a análise.',
    tone: 'neutral',
    rank: 2,
  },
  MODEL_UNAVAILABLE: {
    label: 'Análise indisponível',
    description: 'O modelo necessário para a análise não está disponível.',
    tone: 'neutral',
    rank: 2,
  },
  ERROR: {
    label: 'Análise indisponível',
    description: 'A análise automática não pôde ser concluída.',
    tone: 'neutral',
    rank: 2,
  },
}

export function cameraPresentation(camera: CameraApiItem): CameraPresentation {
  if (camera.status === 'INACTIVE') {
    return {
      label: 'Câmera inativa',
      description: 'A câmera aguarda validação e ativação administrativa.',
      tone: 'muted',
      rank: 5,
    }
  }

  if (camera.status === 'OFFLINE') {
    return {
      label: 'Câmera offline',
      description: 'Sem análise automática · somente transmissão.',
      tone: 'neutral',
      rank: 4,
    }
  }

  const streamStatus = camera.operational.stream.status
  if (streamStatus === 'UNAVAILABLE') {
    return {
      label: 'Transmissão indisponível',
      description:
        'A fonte é mantida para tentativa manual, mas não há predição válida enquanto ela estiver indisponível.',
      tone: 'neutral',
      rank: 4,
    }
  }
  if (streamStatus === 'UNKNOWN' || streamStatus === 'CHECKING') {
    return {
      label: 'Verificando transmissão',
      description: 'A disponibilidade da transmissão ainda está sendo verificada.',
      tone: 'neutral',
      rank: 2,
    }
  }

  const analysis = camera.operational.analysis
  if (analysis.status !== 'AVAILABLE') return analysisContent[analysis.status]
  if (!analysis.classification) return analysisContent.AVAILABLE
  return classificationContent[analysis.classification]
}

export function cameraToneClasses(tone: CameraPresentationTone) {
  const tones: Record<CameraPresentationTone, string> = {
    risk: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200',
    attention:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    safe: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
    neutral:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    muted:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-[#071F36] dark:text-slate-300',
  }
  return tones[tone]
}

export function cameraCoordinates(camera: CameraApiItem): [number, number] | null {
  const latitude = camera.address?.latitude ?? camera.latitude
  const longitude = camera.address?.longitude ?? camera.longitude
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return [longitude, latitude]
}

export function cameraAddressLabel(camera: CameraApiItem) {
  const address = camera.address
  if (!address) return 'Endereço não informado'
  const street = [formatTerritoryLabel(address.street), address.number].filter(Boolean).join(', ')
  const territory = [
    address.neighborhood?.name ? formatTerritoryLabel(address.neighborhood.name) : null,
    address.city_ref?.name ?? address.city,
  ]
    .filter(Boolean)
    .join(' · ')
  return [street, territory].filter(Boolean).join(' — ') || 'Endereço não informado'
}

export function formatCameraDate(value: string | null) {
  if (!value) return 'Não disponível'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não disponível'
  return new Intl.DateTimeFormat(formatLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function formatNullablePercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Não disponível'
  return `${Math.min(100, Math.max(0, value)).toLocaleString(formatLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function legacyCameraAnalysisLabel(camera: CameraWithPrediction) {
  const probabilities = camera.prediction?.probabilities
  if (!probabilities) return 'Ainda não analisada'
  const candidates = [
    { state: 'normal', value: probabilities.normal },
    { state: 'medium', value: probabilities.medium },
    { state: 'flooded', value: probabilities.flooded },
  ].filter(
    (item): item is { state: string; value: number } =>
      typeof item.value === 'number' && Number.isFinite(item.value),
  )
  if (!candidates.length) return 'Ainda não analisada'
  const highest = candidates.reduce((current, item) =>
    item.value > current.value ? item : current,
  )
  if (highest.state === 'flooded') return 'Indício de alagamento'
  if (highest.state === 'medium') return 'Atenção: possível alagamento'
  return 'Sem indício na análise'
}
