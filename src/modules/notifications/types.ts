import type { Paginated } from '@/shared'

export type OperationalAlertStatus =
  | 'OPEN_INDICATION'
  | 'CONFIRMED'
  | 'DISMISSED'
  | 'RESOLVED'

export interface AlertCamera {
  id: string
  description: string
  administrative_status: string
  detail_path: string
}

export interface AlertRegion {
  id: string
  name: string
  city: { id: string; name: string }
}

export interface AlertEvidence {
  initial_detection_id: string
  latest_detection_id: string
  classification: string
  confidence: number
  probabilities: { normal: number; medium: number; flooded: number }
  model_version: string
  image_url: string | null
}

export interface FloodDetectionRecordSummary {
  id: string
  camera_id: string
  created_at: string
  is_flooded: boolean
  medium: boolean
  confidence: number
  probabilities: { normal: number; medium: number; flooded: number }
  image_url: string | null
}

export interface AlertTransition {
  id: string
  from_status: OperationalAlertStatus | null
  to_status: OperationalAlertStatus
  source: string
  actor: { id?: string; name?: string; email?: string } | string | null
  reason: string | null
  notify_subscribers: boolean | null
  created_at: string
}

export interface AlertPublication {
  title: string
  message: string
  confirmed_at: string
}

export interface OperationalAlert {
  id: string
  status: OperationalAlertStatus
  camera: AlertCamera
  region: AlertRegion | null
  evidence: AlertEvidence
  detection_records: {
    initial: FloodDetectionRecordSummary
    latest: FloodDetectionRecordSummary
  }
  first_detected_at: string
  last_detected_at: string
  publication: AlertPublication | null
  transitions: AlertTransition[]
  delivery_summary: { pending: number; sent: number; failed: number; expired: number }
}

export interface OperationalAlertFilters {
  status?: OperationalAlertStatus | ''
  region?: string
  neighborhood_id?: string
  camera?: string
  date_from?: string
  date_to?: string
  page?: number
}

export interface RegionSubscription {
  id?: string
  region: AlertRegion | null
  neighborhood?: { id: string; name: string; city: string; region_id: string | null } | null
  created_at?: string
}

export interface SavedPlace {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_km: number
  territory: { city: string | null; region: string | null; neighborhood: string | null }
}

export type NotificationOrigin = 'FLOOD_POINT' | 'CAMERA' | 'MANUAL'
export type NotificationEventStatus = 'DRAFT' | 'PUBLISHED' | 'RESOLVED' | 'CANCELED'
export interface NotificationEvent {
  id: string
  origin: NotificationOrigin
  status: NotificationEventStatus
  severity: 'INFO' | 'ATTENTION' | 'CRITICAL'
  title: string
  message: string
  destination_url: string
  regions: AlertRegion[]
  neighborhoods: { id: string; name: string; city: string }[]
  is_global: boolean
  audience_count: number
  delivery_summary: { pending: number; sent: number; failed: number; expired: number }
  created_at: string
  published_at: string | null
}

export interface PushConfig {
  enabled: boolean
  application_server_key: string
}

export type PushUiState =
  | 'unsupported'
  | 'disabled_by_server'
  | 'prompt'
  | 'denied'
  | 'subscribing'
  | 'subscribed'
  | 'temporary_error'

export type OperationalAlertsPage = Paginated<OperationalAlert>
