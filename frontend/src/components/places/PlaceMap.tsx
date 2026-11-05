import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Place } from '@/api/types'
import { isFood } from '@/features/places/categories'
import type { Center } from '@/features/places/location'

type Props = {
  center: Center
  places: Place[]
  selected: string | null
  onSelect: (id: string) => void
  label: string
  showMe: boolean
}

/**
 * OpenStreetMap tiles with Leaflet (free, no key). The pins are plain HTML styled in index.css,
 * rust for eating and drinking, sage for the rest. Leaflet is used directly (no wrapper library):
 * React owns the <div>, Leaflet draws inside it.
 */
export function PlaceMap({ center, places, selected, onSelect, label, showMe }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pins = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onSelect)

  useEffect(() => {
    pick.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lon], 14)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    pins.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
    // The map is created once; the center is followed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.flyTo([center.lat, center.lon], 14, { duration: 0.8 })
  }, [center.lat, center.lon])

  useEffect(() => {
    const layer = pins.current
    if (!layer) return
    layer.clearLayers()
    if (showMe) {
      L.marker([center.lat, center.lon], {
        icon: L.divIcon({ className: '', html: '<span class="cravio-me"></span>', iconSize: [18, 18] }),
        interactive: false,
      }).addTo(layer)
    }
    for (const p of places) {
      const on = p.id === selected
      const kind = isFood(p.category) ? 'food' : 'go'
      L.marker([p.latitude, p.longitude], {
        title: p.name,
        alt: p.name,
        keyboard: true,
        zIndexOffset: on ? 1000 : 0,
        icon: L.divIcon({
          className: '',
          html: `<span class="cravio-pin ${kind}${on ? ' on' : ''}"></span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        }),
      })
        .on('click', () => pick.current(p.id))
        .addTo(layer)
    }
  }, [places, selected, showMe, center.lat, center.lon])

  return <div ref={box} role="region" aria-label={label} className="cravio-map size-full" />
}
