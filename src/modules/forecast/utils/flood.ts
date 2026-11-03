import { formatLocale } from '@/app/i18n'
import type { CameraWithPrediction } from '@/modules/forecast'

export const displayPercent = (p: number) => Math.round(p)

export const riskLabel = (prob: number) => {
  if (prob > 70) return 'Alta probabilidade de risco'
  if (prob > 40) return 'Média probabilidade de risco'
  return 'Baixa probabilidade de risco'
}

export const riskLevel = (prob: number) => {
  if (prob > 70) return 'Alto'
  if (prob > 40) return 'Médio'
  return 'Baixo'
}

export const riskClass = (prob: number) => {
  if (prob > 70) return 'text-red-600 font-bold text-lg'
  if (prob > 40) return 'text-yellow-500 font-bold text-lg'
  return 'text-green-600 font-bold text-lg'
}

export function displayFloodPercent(cam: CameraWithPrediction): number | null {
  if (cam.prediction?.probabilities && typeof cam.prediction.probabilities.flooded === 'number') {
    const v = cam.prediction.probabilities.flooded
    const clamped = Math.min(100, Math.max(0, v))
    return Number(clamped.toFixed(2))
  }
  return cam.flood_percentage
}

export function formatFloodPercent(cam: CameraWithPrediction): string {
  const value = displayFloodPercent(cam)
  if (value === null) return 'Não disponível'
  return value.toLocaleString(formatLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
