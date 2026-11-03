import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import mapboxgl from 'mapbox-gl'
import router from '@/app/router'
import { cameraCoordinates } from '@/modules/cameras'
import { isInsideAquaTerritory } from '@/shared'
import type { CameraApiItem, useFloodCameraMonitoringStore } from '@/modules/cameras'
import { localePath } from '@/app/i18n'

type CameraStore = ReturnType<typeof useFloodCameraMonitoringStore>

export const useMapCameraMarkers = (
  ctrl: CameraStore,
  options?: {
    cameras?: MaybeRefOrGetter<CameraApiItem[]>
    selectionMode?: MaybeRefOrGetter<boolean>
    selectedCameraId?: MaybeRefOrGetter<string | null>
    onSelect?: (camera: CameraApiItem) => void
    interactionMode?: MaybeRefOrGetter<'navigate' | 'select' | 'popup'>
    onPopup?: (camera: CameraApiItem) => void
  },
) => {
  const markers = shallowRef<mapboxgl.Marker[]>([])
  const markerElements = new Map<string, HTMLButtonElement>()

  function applySelection(element: HTMLButtonElement, cameraId: string) {
    const selectionMode =
      (options?.interactionMode && toValue(options.interactionMode) === 'select') ||
      (options?.selectionMode ? toValue(options.selectionMode) : false)
    const selected = selectionMode && options?.selectedCameraId
      ? toValue(options.selectedCameraId) === cameraId
      : false
    if (selectionMode) element.setAttribute('aria-pressed', String(selected))
    else element.removeAttribute('aria-pressed')
    element.style.filter = ''
  }

  const setup = (map: mapboxgl.Map) => {
    cleanup()
    const cameras = options?.cameras ? toValue(options.cameras) : ctrl.camerasRaw
    cameras.forEach((camera) => {
      const coordinates = cameraCoordinates(camera)
      if (!coordinates || !isInsideAquaTerritory(coordinates)) {
        console.warn('Câmera sem coordenadas:', camera)
        return
      }
      const analysis = camera.operational.analysis
      const classification =
        analysis.status === 'AVAILABLE' && typeof analysis.classification === 'string'
          ? analysis.classification
          : null
      const icon =
        camera.status === 'OFFLINE'
          ? 'camera_icon_offline.svg'
          : classification === 'FLOOD_INDICATION'
          ? 'camera_icon_flood.svg'
          : classification === 'INTERMEDIATE_INDICATION'
            ? 'camera_icon_medium.svg'
            : 'camera_icon_normal.svg'
      const iconSize =
        camera.status === 'OFFLINE'
          ? 48
          : classification === 'FLOOD_INDICATION'
            ? 84
            : classification === 'INTERMEDIATE_INDICATION'
              ? 72
              : 60
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'custom-marker'
      element.setAttribute(
        'aria-label',
        `${options?.interactionMode && toValue(options.interactionMode) === 'popup' ? 'Exibir' : options?.selectionMode && toValue(options.selectionMode) ? 'Selecionar' : 'Abrir'} câmera ${camera.description}`,
      )
      Object.assign(element.style, {
        backgroundImage: `url("/icons/${icon}")`, width: `${iconSize}px`, height: `${iconSize}px`,
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', cursor: 'pointer',
        border: '0', backgroundColor: 'transparent',
      })
      applySelection(element, camera.id)
      markerElements.set(camera.id, element)
      const activate = (event: Event) => {
        event.stopPropagation()
        const mode = options?.interactionMode ? toValue(options.interactionMode) : null
        if (mode === 'popup') {
          options?.onPopup?.(camera)
          return
        }
        if (mode === 'select' || (options?.selectionMode && toValue(options.selectionMode))) {
          options?.onSelect?.(camera)
          return
        }
        void router.push(localePath(`/cameras/${camera.id}`))
      }
      element.addEventListener('click', activate)
      const marker = new mapboxgl.Marker(element).setLngLat(coordinates)
      if (ctrl.showCameras) marker.addTo(map)
      markers.value.push(marker)
    })
  }

  const setVisible = (map: mapboxgl.Map, visible: boolean) => {
    markers.value.forEach((marker) => (visible ? marker.addTo(map) : marker.remove()))
  }

  function cleanup() {
    markers.value.forEach((marker) => marker.remove())
    markers.value = []
    markerElements.clear()
  }

  function updateSelection() {
    markerElements.forEach((element, cameraId) => applySelection(element, cameraId))
  }

  return { setup, setVisible, cleanup, updateSelection }
}
