import { formatLocale } from '@/app/i18n'
import axios from 'axios'
import type {
  FloodEvidenceKind,
  FloodEventStatus,
  FloodImpactFreshness,
  FloodImpactRelation,
  FloodImpactRunSummary,
} from './types/floodImpact'
import type { CreatableFloodEvidenceKind } from './types/floodImpact'

export const evidenceLabels: Record<FloodEvidenceKind, string> = {
  FORECAST: 'Previsão',
  CAMERA_OBSERVATION: 'Observação por câmera',
  USER_REPORT: 'Relato de usuário',
  CONFIRMED_OCCURRENCE: 'Ocorrência confirmada',
  LEGACY_UNCLASSIFIED: 'Legado não classificado',
}

export const creatableEvidenceOptions: ReadonlyArray<{
  value: CreatableFloodEvidenceKind
  label: string
}> = [
  { value: 'FORECAST', label: evidenceLabels.FORECAST },
  { value: 'CAMERA_OBSERVATION', label: evidenceLabels.CAMERA_OBSERVATION },
  { value: 'USER_REPORT', label: evidenceLabels.USER_REPORT },
]

export const statusLabels: Record<FloodEventStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Publicado',
  SUPERSEDED: 'Substituído',
  REVOKED: 'Revogado',
}

export const freshnessLabels: Record<FloodImpactFreshness, string> = {
  NOT_REQUESTED: 'Cálculo não solicitado',
  RUNNING: 'Cálculo em andamento',
  CURRENT: 'Cálculo atual',
  FAILED: 'Falha no cálculo',
  STALE: 'Cálculo desatualizado',
}

export const relationLabels: Record<FloodImpactRelation, string> = {
  CROSSES: 'Cruza a mancha',
  WITHIN: 'Contido na mancha',
}

export function formatDate(value?: string | null) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleString(formatLocale())
}

export function formatLength(value: number) {
  if (!Number.isFinite(value)) return 'Não informado'
  return value >= 1000
    ? `${(value / 1000).toLocaleString(formatLocale(), { maximumFractionDigits: 2 })} km`
    : `${value.toLocaleString(formatLocale(), { maximumFractionDigits: 1 })} m`
}

export function formatFraction(value: number) {
  if (!Number.isFinite(value)) return 'Não informado'
  return `${(Math.max(0, value) * 100).toLocaleString(formatLocale(), { maximumFractionDigits: 1 })}%`
}

export function datasetLabel(run?: FloodImpactRunSummary | null) {
  if (!run?.dataset) return 'Malha viária não informada'
  if (typeof run.dataset === 'string') return run.dataset
  return [
    run.dataset.name ?? run.dataset.title,
    run.dataset.release ?? run.dataset.version ?? run.dataset.source_version,
  ].filter(Boolean).join(' · ')
    || run.dataset.id
    || 'Malha viária não informada'
}

export function impactErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback
  const payload = error.response?.data as {
    error?: { detail?: unknown; fields?: Record<string, unknown> }
    detail?: unknown
  } | undefined
  const detail = payload?.error?.detail ?? payload?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (error.response?.status === 409) return 'O evento foi atualizado por outra pessoa. Recarregue antes de continuar.'
  if (error.response?.status === 422) return 'A geometria não atende às regras territoriais do cálculo.'
  return fallback
}
