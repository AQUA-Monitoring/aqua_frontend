import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'

export type TerritoryGeometry = Polygon | MultiPolygon

export interface TerritoryProperties {
  id: string
  name: string
  type: 'city' | 'region' | 'neighborhood'
  city: string | null
  city_id: string | null
  region_id: string | null
  source_record_id?: string
  provenance?: {
    dataset_id: string
    authority: string
    source_version: string
    source_url: string
    license: { name: string; url: string }
  } | null
}

export type TerritoryFeature = Feature<TerritoryGeometry, TerritoryProperties>
export type TerritoryFeatureCollection = FeatureCollection<TerritoryGeometry, TerritoryProperties>

export type TerritoryCatalogSource = 'canonical' | 'local-fallback' | 'unavailable'

export interface TerritoryCatalogOption {
  id: string
  name: string
  city?: string
  regionId: string | null
}

export interface TerritoryCatalog {
  regions: TerritoryCatalogOption[]
  neighborhoods: TerritoryCatalogOption[]
}

export interface TerritoryCatalogNeighborhoodDto {
  id: string
  name: string
  city?: string
  city_id?: string | null
  region?: { id: string; name: string } | null
}

export interface TerritoryCatalogRegionDto {
  id: string
  name: string
  city?: string
  neighborhoods?: TerritoryCatalogNeighborhoodDto[]
}

export interface TerritoryCatalogDto {
  regions?: TerritoryCatalogRegionDto[]
  neighborhoods?: TerritoryCatalogNeighborhoodDto[]
}

export interface ReferenceBaseStatusDto {
  reference_base_revision: string | null
  reference_base_status: string | null
  reference_base_activated_at: string | null
  reference_base_schema_version: number | null
  reference_base_archive_sha256: string | null
}

export interface ReferenceBaseStatus {
  referenceBaseRevision: string | null
  referenceBaseStatus: string | null
  referenceBaseActivatedAt: string | null
  referenceBaseSchemaVersion: number | null
  referenceBaseArchiveSha256: string | null
}

export interface ReferenceTerritoryPropertiesDto {
  reference_territory_id: string
  name: string
  type: 'city' | 'region' | 'neighborhood'
  city: string | null
  reference_city_id: string | null
  reference_region_id?: string | null
  reference_neighborhood_id?: string | null
  source_record_id?: string
}

export type ReferenceTerritoryFeatureDto = Feature<
  TerritoryGeometry,
  ReferenceTerritoryPropertiesDto
>

export type ReferenceTerritoryFeatureCollectionDto = FeatureCollection<
  TerritoryGeometry,
  ReferenceTerritoryPropertiesDto
> & {
  reference_base_revision: string | null
}

export interface ReferenceTerritoryProperties {
  referenceTerritoryId: string
  name: string
  type: 'city' | 'region' | 'neighborhood'
  city: string | null
  referenceCityId: string | null
  referenceRegionId: string | null
  referenceNeighborhoodId: string | null
  sourceRecordId: string | null
}

export type ReferenceTerritoryFeature = Feature<TerritoryGeometry, ReferenceTerritoryProperties>

export interface ReferenceTerritoryCollection {
  type: 'FeatureCollection'
  referenceBaseRevision: string | null
  features: ReferenceTerritoryFeature[]
}

export interface ReferenceEntityDto {
  name: string
  reference_city_id?: string
  reference_region_id?: string
  reference_neighborhood_id?: string
}

export interface ReferenceEntity {
  name: string
  referenceCityId: string | null
  referenceRegionId: string | null
  referenceNeighborhoodId: string | null
}

export interface ReferenceNeighborhoodImpactDto {
  reference_neighborhood_id: string
  name: string
  relation: string
  intersection_area_m2: number | null
  footprint_fraction: number | null
  region: {
    reference_region_id: string
    name: string
  } | null
}

export interface ResolveReferenceAreaPayloadDto {
  footprint: MultiPolygon
}

export interface ResolveReferenceAreaDto {
  crs: 'EPSG:4326'
  reference_base_revision: string | null
  status: string
  reason_codes: string[]
  method: string
  city: ReferenceEntityDto
  region: ReferenceEntityDto | null
  neighborhood: ReferenceEntityDto | null
  neighborhoods: ReferenceNeighborhoodImpactDto[]
  representative_point: Point
  primary_street: unknown | null
  primary_road_axis_segment: unknown | null
  algorithm_version: 'territorial-resolution-v2' | string
}

export interface ReferenceNeighborhoodImpact {
  referenceNeighborhoodId: string
  name: string
  relation: string
  intersectionAreaM2: number | null
  footprintFraction: number | null
  region: {
    referenceRegionId: string
    name: string
  } | null
}

export interface ResolveReferenceArea {
  crs: 'EPSG:4326'
  referenceBaseRevision: string | null
  status: string
  reasonCodes: string[]
  method: string
  city: ReferenceEntity
  region: ReferenceEntity | null
  neighborhood: ReferenceEntity | null
  neighborhoods: ReferenceNeighborhoodImpact[]
  representativePoint: Point
  primaryStreet: unknown | null
  primaryRoadAxisSegment: unknown | null
  algorithmVersion: string
}
